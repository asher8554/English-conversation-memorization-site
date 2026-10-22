// 테스트 전용 APK에서 학습 이동·완료 중복 방지·복원과 백업 이전을 확인한다.
package com.asher.englishstudy

import android.content.Context
import android.view.Window
import android.view.WindowManager
import androidx.activity.compose.setContent
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.window.DialogWindowProvider
import androidx.lifecycle.ViewModelProvider
import androidx.test.core.app.ActivityScenario
import androidx.test.core.app.ApplicationProvider
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createEmptyComposeRule
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.Assert.*
import java.time.Instant

class StudyFlowTest {
    @get:Rule val compose = createEmptyComposeRule()
    private lateinit var scenario: ActivityScenario<MainActivity>
    private lateinit var model: StudyModel

    @Before fun launchTestApp() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        check(context.packageName.endsWith(".debug")) { "테스트는 별도 debug 앱에서만 실행합니다." }
        context.getSharedPreferences("study", 0).edit().clear().commit()
        context.getSharedPreferences("notion", 0).edit().clear().commit()
        start()
    }
    private fun start() {
        scenario = ActivityScenario.launch(MainActivity::class.java)
        scenario.onActivity { model = ViewModelProvider(it)[StudyModel::class.java] }
    }
    @After fun close() { scenario.close() }

    @Test fun courseSyncCompletionClosesDialogAndFailureOrReopeningKeepsItOpen() {
        compose.onNodeWithContentDescription("Notion 자료와 진도 동기화").performClick()
        compose.onNodeWithText("Notion 동기화").assertIsDisplayed()
        scenario.recreate()
        compose.onNodeWithText("Notion 동기화").assertIsDisplayed()
        compose.runOnIdle { model.fetchNotionCourses() }
        compose.waitUntil { !model.syncing && model.syncStatus.isNotBlank() }
        compose.onNodeWithText("Notion 동기화").assertIsDisplayed()
        compose.runOnIdle { model.connection.markSynced("progressSyncedAt", "2026-10-22T05:00:00Z") }
        scenario.recreate()
        compose.onNodeWithText("Notion 동기화").assertIsDisplayed()
        // 저장 완료 시각이 갱신된 상태에서 복원돼도 기존 닫기와 같은 화면으로 돌아간다.
        compose.runOnIdle { model.connection.markSynced("dataSyncedAt", "2026-10-22T05:00:01Z") }
        scenario.recreate()
        compose.onNodeWithText("Notion 동기화").assertDoesNotExist()
        compose.onNodeWithText("Show Answer").assertIsDisplayed()
        compose.onNodeWithContentDescription("Notion 자료와 진도 동기화").performClick()
        compose.onNodeWithText("Notion 동기화").assertIsDisplayed()
    }

    @Test fun syncKeepsActivityAndDialogAwakeAndReleasesBothWindows() {
        val syncing = mutableStateOf(false)
        val showDialog = mutableStateOf(true)
        var activityWindow: Window? = null
        var dialogWindow: Window? = null
        scenario.onActivity { activity ->
            activityWindow = activity.window
            activity.setContent {
                KeepScreenOnWhileSyncing(activity.window, syncing.value)
                StudyTheme(true) {
                    if (showDialog.value) AlertDialog(onDismissRequest = {}, confirmButton = {}, text = {
                        val window = (LocalView.current.parent as DialogWindowProvider).window
                        KeepScreenOnWhileSyncing(window, syncing.value)
                        SideEffect { dialogWindow = window }
                        Text("동기화 화면 유지 검증")
                    })
                }
            }
        }
        fun awake(window: Window?) = window!!.attributes.flags and WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON != 0
        compose.runOnIdle { assertNotNull(dialogWindow); assertFalse(awake(activityWindow)); assertFalse(awake(dialogWindow)); syncing.value = true }
        compose.runOnIdle { assertTrue(awake(activityWindow)); assertTrue(awake(dialogWindow)); showDialog.value = false }
        compose.runOnIdle { assertTrue(awake(activityWindow)); assertFalse(awake(dialogWindow)); showDialog.value = true }
        compose.runOnIdle { assertTrue(awake(dialogWindow)); syncing.value = false }
        compose.runOnIdle { assertFalse(awake(activityWindow)); assertFalse(awake(dialogWindow)); syncing.value = true }
        compose.runOnIdle { assertTrue(awake(activityWindow)); assertTrue(awake(dialogWindow)); syncing.value = false }
        compose.runOnIdle { assertFalse(awake(activityWindow)); assertFalse(awake(dialogWindow)) }
    }

    @Test fun chapterAndCardNavigationSurviveRecreationAndCompletionIsRecordedOnce() {
        compose.onNodeWithText("« Prev").assertIsNotEnabled()
        compose.onNodeWithText("Show Answer").performClick()
        compose.runOnIdle { assertTrue(model.revealed) }
        compose.onNodeWithText("Next »").performScrollTo().performClick()
        compose.runOnIdle { assertEquals(1, model.index); assertFalse(model.revealed) }
        scenario.recreate()
        compose.waitForIdle()
        compose.runOnIdle { assertEquals(1, model.index) }
        compose.onNodeWithText("다음 챕터 »").performScrollTo().performClick()
        compose.runOnIdle {
            assertEquals("Day 002", model.day)
            while (!model.lastCard) model.moveCard(1)
        }
        compose.onNodeWithText("복습 완료 · Review Complete").performScrollTo().performClick()
        compose.onNodeWithText("기록 완료").assertIsNotEnabled()
        compose.runOnIdle {
            model.complete()
            assertEquals(1, reviews(model.values, "conversation").getJSONObject("Day 002").getInt("count"))
        }
        scenario.close()
        start()
        compose.runOnIdle { assertEquals("Day 002", model.day); assertEquals(0, model.index) }
    }

    @Test fun browserBackupPreviewAndConfirmationPreserveRecordsAndSettings() {
        val imported = incrementReview(mapOf("questionFontSize" to "2.4", "ttsAutoQuestion" to "false",
            "ttsEnRate" to "0.85", "useDarkMode" to "true"), Chapter("basic-verbs", "Day 002"), Instant.parse("2026-10-22T02:00:00Z"))
        compose.runOnIdle { model.prepareImport(writeBackup(imported)); assertFalse(model.values.containsKey("lastCompletedChapter")) }
        compose.onNodeWithText("브라우저 기록 가져오기").assertIsDisplayed()
        compose.onNodeWithText("가져오기", useUnmergedTree = true).performClick()
        compose.runOnIdle {
            assertEquals("basic-verbs", model.courseId)
            assertEquals("Day 002", model.day)
            assertEquals(2.4f, model.questionSize)
            assertFalse(model.flag("ttsAutoQuestion"))
            assertEquals(1, reviews(model.values, "basic-verbs").getJSONObject("Day 002").getInt("count"))
            model.prepareImport("{invalid}")
            assertNull(model.pendingImport)
            assertEquals("Day 002", model.day)
        }
    }

    @Test fun courseAndSortControlsKeepExistingChapterNavigationRules() {
        compose.onNodeWithText("기본동사").performClick()
        compose.onNodeWithText("기본동사").assertIsSelected()
        compose.runOnIdle { model.selectDay("Day 002") }
        val density = ApplicationProvider.getApplicationContext<Context>().resources.displayMetrics.density
        val touchBounds = compose.onNodeWithContentDescription("역순 정렬").fetchSemanticsNode().touchBoundsInRoot
        assertTrue("작게 표시한 체크박스도 터치 영역은 48dp 이상이어야 합니다.", touchBounds.height >= 48 * density - 1)
        compose.onNodeWithContentDescription("역순 정렬").performClick()
        compose.runOnIdle {
            assertEquals("Day 002", model.day)
            assertEquals(model.course.days.keys.reversed(), model.days)
        }
        compose.onNodeWithContentDescription("무작위 정렬").performClick()
        compose.runOnIdle {
            assertEquals(model.course.days.keys.toSet(), model.days.toSet())
            assertEquals(model.days.first(), model.day)
        }
        compose.onNodeWithText("영어회화").performClick()
        compose.runOnIdle { assertEquals("기본", model.order); assertEquals("Day 001", model.day) }
    }

    @Test fun connectionKeyIsEncryptedAndNeverIncludedInProgressBackup() {
        compose.runOnIdle {
            val context = ApplicationProvider.getApplicationContext<Context>()
            val connection = NotionConnection(context)
            val value = "local-test-value-with-no-network-use"
            connection.saveToken(value)
            val prefs = context.getSharedPreferences("notion", 0)
            val firstCipher = prefs.getString("secret", "")!!
            assertFalse(firstCipher.contains(value))
            assertEquals(value, connection.token())
            connection.saveToken(value)
            assertNotEquals(firstCipher, prefs.getString("secret", ""))
            assertFalse(writeBackup(model.values).contains(value))
        }
    }
}
