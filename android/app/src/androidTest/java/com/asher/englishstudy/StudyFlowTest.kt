// 테스트 전용 APK에서 학습 이동·완료 중복 방지·복원과 백업 이전을 확인한다.
package com.asher.englishstudy

import android.content.Context
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
