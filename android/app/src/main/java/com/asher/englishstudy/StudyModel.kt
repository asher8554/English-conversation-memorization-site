// 학습 상태와 진도를 관리하고 원본을 보존하며 백업을 가져온다.
package com.asher.englishstudy

import android.app.Application
import android.os.Handler
import android.os.Looper
import android.util.AtomicFile
import androidx.lifecycle.AndroidViewModel
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import org.json.JSONObject
import java.io.File
import java.time.Instant
import java.util.concurrent.Executors

class StudyModel(application: Application) : AndroidViewModel(application) {
    private val prefs = application.getSharedPreferences("study", 0)
    private var storageHealthy = true
    var notice by mutableStateOf("")
    var courses by mutableStateOf(loadCourses())
        private set
    var values by mutableStateOf(loadValues())
        private set
    var courseId by mutableStateOf(initialChapter().course)
        private set
    var day by mutableStateOf(initialChapter().day)
        private set
    var index by mutableStateOf(0)
        private set
    var revealed by mutableStateOf(false)
        private set
    var recorded by mutableStateOf(false)
        private set
    var order by mutableStateOf("기본")
        private set
    var days by mutableStateOf(course.days.keys.toList())
        private set
    var pendingImport by mutableStateOf<Map<String, String>?>(null)
        private set
    val course get() = courses.first { it.id == courseId }
    val cards get() = course.days.getValue(day)
    val card get() = cards[index]
    val dark get() = values["useDarkMode"] != "false"
    val questionSize get() = values["questionFontSize"]?.toFloat() ?: 2f
    val answerSize get() = values["answerFontSize"]?.toFloat() ?: 1.6f
    val lastCard get() = index == cards.lastIndex
    val canPrev get() = index > 0 || days.indexOf(day) > 0
    val canNext get() = index < cards.lastIndex || days.indexOf(day) < days.lastIndex
    val speech = NativeSpeech(application) { notice = it }
    val connection = NotionConnection(application)
    var connectionConfigured by mutableStateOf(connection.configured)
        private set
    var syncing by mutableStateOf(false)
        private set
    var syncStatus by mutableStateOf("")
        private set
    private val executor = Executors.newSingleThreadExecutor()
    private val main = Handler(Looper.getMainLooper())

    private fun loadCourses(): List<Course> {
        val app = getApplication<Application>()
        val saved = AtomicFile(File(app.filesDir, "notion-data.json"))
        if (saved.baseFile.exists() || File(saved.baseFile.path + ".bak").exists()) {
            runCatching { saved.openRead().bufferedReader().use { parseCourses(it.readText()) } }
                .onSuccess { return it }
                .onFailure { notice = "다운로드 자료를 읽지 못해 앱에 포함된 자료를 열었습니다. 기존 파일은 보존됩니다." }
        }
        return parseCourses(app.assets.open("data.json").bufferedReader().use { it.readText() })
    }

    fun saveNotionToken(token: String): Boolean = runCatching { connection.saveToken(token) }.fold(
        onSuccess = { connectionConfigured = true; syncStatus = "연결 키를 저장했습니다. 수동 동기화로 접근 권한을 확인해주세요."; true },
        onFailure = { syncStatus = it.message ?: "연결 키 저장에 실패했습니다."; false })

    private fun notionJob(work: (NotionClient) -> String) {
        if (syncing) return
        syncing = true
        syncStatus = "Notion 연결을 확인합니다."
        executor.execute {
            val result = runCatching { work(NotionClient(connection.token()) { message -> main.post { syncStatus = message } }) }
            main.post {
                syncing = false
                syncStatus = result.getOrElse { it.message ?: "동기화에 실패했습니다. 저장된 자료와 앱 기록은 유지됩니다." }
            }
        }
    }

    fun fetchNotionCourses() {
        val current = courses
        notionJob { client ->
            val next = client.fetchCourses(current)
            val app = getApplication<Application>()
            val file = AtomicFile(File(app.filesDir, "notion-data.json"))
            File(app.filesDir, "before-notion-update.json").writeBytes(if (file.baseFile.exists() || File(file.baseFile.path + ".bak").exists())
                file.openRead().use { it.readBytes() } else encodeCourses(current).toByteArray(Charsets.UTF_8))
            val stream = file.startWrite()
            try {
                stream.write(encodeCourses(next).toByteArray(Charsets.UTF_8))
                file.finishWrite(stream)
            } catch (e: Exception) { file.failWrite(stream); throw e }
            main.post {
                courses = next
                val previousDay = day
                days = when (order) {
                    "역순" -> course.days.keys.reversed()
                    "무작위" -> course.days.keys.shuffled()
                    else -> course.days.keys.toList()
                }
                selectDay(previousDay.takeIf { it in days } ?: days.first())
            }
            connection.markSynced("dataSyncedAt", Instant.now().toString())
            "두 코스의 Notion 자료를 저장했습니다. 영어회화 ${next[0].days.size}일·기본동사 ${next[1].days.size}일입니다."
        }
    }

    fun sendNotionProgress() {
        val snapshot = values.toMap()
        notionJob { client ->
            val count = client.sendProgress(snapshot)
            if (count == 0) "전송할 복습 기록이 없습니다. 먼저 학습을 완료하거나 브라우저 기록을 가져와주세요."
            else {
                connection.markSynced("progressSyncedAt", Instant.now().toString())
                "${count}개 챕터의 진도를 Notion에 저장하고 다시 확인했습니다. 이후 학습 기록은 다음 수동 전송에 포함됩니다."
            }
        }
    }

    private fun loadValues(): Map<String, String> = try {
        validateValues(JSONObject(prefs.getString("values", "{}")!!))
    } catch (e: Exception) {
        runCatching {
            File(getApplication<Application>().filesDir, "unreadable-records-${System.currentTimeMillis()}.json")
                .writeText(prefs.getString("values", "{}")!!)
        }.onFailure { storageHealthy = false }
        notice = "저장된 기록을 읽지 못했습니다. 원본을 보존하며, 백업 파일에서 복원해주세요."
        emptyMap()
    }

    private fun initialChapter(): Chapter {
        val completed = completion(values)
        if (completed != null && courses.any { it.id == completed.course && completed.day in it.days }) return completed
        val course = courses.find { it.id == values["selectedCourseId"] } ?: courses.first()
        return Chapter(course.id, course.days.keys.first())
    }

    fun save(next: Map<String, String>): Boolean {
        if (!storageHealthy) {
            notice = "손상된 원본 기록을 백업하지 못해 저장을 중단했습니다. 저장 공간을 확인하고 앱을 다시 시작해주세요."
            return false
        }
        if (!prefs.edit().putString("values", JSONObject(next).toString()).commit()) {
            notice = "기록을 저장하지 못했습니다. 저장 공간을 확인한 뒤 다시 시도해주세요."
            return false
        }
        values = next
        return true
    }

    fun setting(key: String, value: String) { save(values + (key to value)) }
    fun flag(key: String, fallback: Boolean = true) = values[key]?.toBooleanStrictOrNull() ?: fallback
    fun rate(key: String, fallback: Float) = values[key]?.toFloat() ?: fallback

    fun selectCourse(id: String) {
        if (!save(values + ("selectedCourseId" to id))) return
        courseId = id
        order = "기본"
        days = course.days.keys.toList()
        selectDay(days.first())
    }

    fun selectDay(next: String) {
        day = next
        index = 0
        revealed = false
        recorded = false
    }

    fun moveChapter(delta: Int) { days.getOrNull(days.indexOf(day) + delta)?.let(::selectDay) }
    fun moveCard(delta: Int) {
        val target = adjacentCard(days, course.days, day, index, delta)
        if (target == day to index) return
        day = target.first
        index = target.second
        revealed = false
        recorded = false
    }

    fun sort(mode: String) {
        order = mode
        days = when (mode) {
            "역순" -> course.days.keys.reversed()
            "무작위" -> course.days.keys.shuffled()
            else -> course.days.keys.toList()
        }
        if (mode == "무작위") selectDay(days.first())
    }

    fun reveal() { revealed = true }
    fun complete() {
        if (!lastCard || recorded) return
        runCatching { incrementReview(values, Chapter(courseId, day), Instant.now()) }
            .onSuccess { if (save(it)) { recorded = true; notice = "$day 복습을 기록했습니다." } }
            .onFailure { notice = it.message ?: "기록 저장에 실패했습니다." }
    }

    fun resize(delta: Float) {
        if (questionSize + delta in 1f..4.01f) save(values + mapOf(
            "questionFontSize" to (questionSize + delta).toString(),
            "answerFontSize" to (answerSize + delta).toString()))
    }

    fun prepareImport(text: String) {
        runCatching { readBackup(text) }.onSuccess { pendingImport = it }
            .onFailure { notice = "가져오지 않았습니다. ${it.message ?: "파일 형식을 확인해주세요."}" }
    }
    fun cancelImport() { pendingImport = null }
    fun confirmImport() {
        val incoming = pendingImport ?: return
        runCatching {
            val backup = File(getApplication<Application>().filesDir, "before-import-${System.currentTimeMillis()}.json")
            backup.writeText(writeBackup(values))
            if (save(values + incoming)) {
                val target = initialChapter()
                courseId = target.course
                order = "기본"
                days = course.days.keys.toList()
                selectDay(target.day)
                pendingImport = null
                notice = "기록과 설정을 가져왔습니다. 음성은 사용 가능한 목록에서 확인해주세요. 기존 앱 기록도 보관했습니다."
            }
        }.onFailure { notice = "기존 기록 백업에 실패해 가져오기를 중단했습니다." }
    }

    fun resetCurrentStats() {
        save(values + ("reviewStats:$courseId" to "{}"))
    }

    override fun onCleared() { executor.shutdownNow(); speech.close() }
}
