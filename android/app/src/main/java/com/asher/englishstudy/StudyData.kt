// 학습 자료와 브라우저 백업의 형식을 검증하고 학습 이동을 계산한다.
package com.asher.englishstudy

import org.json.JSONObject
import java.time.Instant

data class Card(val question: String, val answer: String, val section: String)
data class Course(val id: String, val title: String, val days: Map<String, List<Card>>, val sentences: Map<String, String>)
data class Chapter(val course: String, val day: String)

fun parseCourses(text: String): List<Course> {
    val courses = JSONObject(text).getJSONObject("courses")
    return listOf("conversation", "basic-verbs").map { id ->
        val course = courses.getJSONObject(id)
        val data = course.getJSONObject("data")
        require(data.length() in 1..1000) { "학습 날짜 수가 올바르지 않습니다." }
        val days = data.keys().asSequence().sorted().associateWith { day ->
            require(day.matches(Regex("Day \\d{3}"))) { "날짜 형식이 올바르지 않습니다." }
            val cards = data.getJSONArray(day)
            require(cards.length() in 1..1000) { "$day 카드가 비어 있거나 너무 많습니다." }
            (0 until cards.length()).map { i ->
                val card = cards.getJSONObject(i)
                val question = card.getString("q").trim()
                val answer = card.getString("a").trim()
                require(question.isNotBlank() && answer.isNotBlank() && question.length <= 20000 && answer.length <= 20000) {
                    "$day 질문·정답 형식이 올바르지 않습니다."
                }
                Card(question, answer, card.optString("section"))
            }
        }
        val sentences = course.optJSONObject("dayMainSentences") ?: JSONObject()
        Course(id, course.getString("title"), days, days.keys.associateWith { sentences.optString(it) })
    }
}

val backupKeys = setOf(
    "reviewStats", "reviewStats:conversation", "reviewStats:basic-verbs", "lastCompletedChapter",
    "selectedCourseId", "questionFontSize", "answerFontSize", "useDarkMode", "koVoiceURI", "enVoiceURI",
    "koVoiceName", "enVoiceName", "ttsAutoQuestion", "ttsAutoAnswer", "ttsKoRate", "ttsEnRate"
)

fun validateValues(values: JSONObject): Map<String, String> = values.keys().asSequence().associateWith { key ->
    require(key in backupKeys && values.get(key) is String) { "지원하지 않는 백업 항목입니다. $key" }
    val value = values.getString(key)
    require(value.length <= 500000) { "백업 항목이 너무 큽니다." }
    when {
        key.startsWith("reviewStats") -> {
            val stats = JSONObject(value)
            require(stats.length() <= 1000)
            stats.keys().forEach { day ->
                require(day.matches(Regex("Day \\d{3}")))
                val entry = stats.getJSONObject(day)
                val count = entry.get("count")
                require(count is Number && count.toDouble() in 0.0..1000000.0 && count.toDouble() % 1 == 0.0) {
                    "복습 횟수가 올바르지 않습니다."
                }
                if (!entry.isNull("lastReviewed")) Instant.parse(entry.getString("lastReviewed"))
            }
        }
        key == "lastCompletedChapter" -> {
            val chapter = JSONObject(value)
            require(chapter.getString("courseId") in listOf("conversation", "basic-verbs"))
            require(chapter.getString("day").matches(Regex("Day \\d{3}")))
        }
        key == "selectedCourseId" -> require(value in listOf("conversation", "basic-verbs"))
        key in setOf("useDarkMode", "ttsAutoQuestion", "ttsAutoAnswer") -> require(value in setOf("true", "false"))
        key.endsWith("FontSize") -> require(value.toFloat().isFinite() && value.toFloat() in .5f..6f)
        key in setOf("ttsKoRate", "ttsEnRate") -> require(value.toFloat().isFinite() && value.toFloat() in .6f..1.3f)
        else -> require(value.length <= 512)
    }
    value
}

fun readBackup(text: String): Map<String, String> {
    require(text.toByteArray(Charsets.UTF_8).size <= 1048576) { "백업 파일은 1MB 이하여야 합니다." }
    val backup = JSONObject(text)
    require(backup.getString("format") == "english-study-backup" && backup.getInt("version") == 1) {
        "English Study 백업 파일이 아닙니다."
    }
    return validateValues(backup.getJSONObject("values")).also { require(it.isNotEmpty()) { "백업 기록이 비어 있습니다." } }
}

fun writeBackup(values: Map<String, String>): String = JSONObject()
    .put("format", "english-study-backup").put("version", 1)
    .put("exportedAt", Instant.now().toString()).put("values", JSONObject(values)).toString(2)

fun completion(values: Map<String, String>): Chapter? = values["lastCompletedChapter"]?.let {
    val chapter = JSONObject(it)
    Chapter(chapter.getString("courseId"), chapter.getString("day"))
}

fun reviews(values: Map<String, String>, course: String): JSONObject = JSONObject(
    values["reviewStats:$course"] ?: (if (course == "conversation") values["reviewStats"] else null) ?: "{}"
)

fun incrementReview(values: Map<String, String>, chapter: Chapter, now: Instant): Map<String, String> {
    val stats = reviews(values, chapter.course)
    val count = stats.optJSONObject(chapter.day)?.optInt("count") ?: 0
    require(count < 1000000) { "복습 횟수의 저장 한도에 도달했습니다." }
    stats.put(chapter.day, JSONObject().put("count", count + 1).put("lastReviewed", now.toString()))
    return values + mapOf("reviewStats:${chapter.course}" to stats.toString(),
        "lastCompletedChapter" to JSONObject().put("courseId", chapter.course).put("day", chapter.day).toString())
}

fun adjacentCard(days: List<String>, cards: Map<String, List<Card>>, day: String, index: Int, delta: Int): Pair<String, Int> {
    val nextIndex = index + delta
    if (nextIndex in cards.getValue(day).indices) return day to nextIndex
    val nextDay = days.indexOf(day) + delta
    if (nextDay !in days.indices) return day to index
    return days[nextDay] to if (delta < 0) cards.getValue(days[nextDay]).lastIndex else 0
}
