// 두 교재의 Notion 블록을 카드로 변환하고 중복 없는 진도 속성을 만든다.
package com.asher.englishstudy

import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant
import java.time.temporal.ChronoUnit

const val PROGRESS_DATABASE_ID = "ed28537c-bbdb-4b26-a49b-6ad249989d32"
const val PROGRESS_SOURCE_ID = "bea4f5d9-74a1-44a3-ac06-026527f880f0"
val notionSources = mapOf("conversation" to "2c63d76f-8874-80e9-a373-d924affa523e", "basic-verbs" to "32f3d76f-8874-8069-b726-d6b6d47f5afd")
private val sections = listOf("Model Examples", "Small talk", "Further Studies")
private val dayPattern = Regex("\\bDay\\s*0*(\\d{1,3})\\b", RegexOption.IGNORE_CASE)
fun JSONArray.objects() = (0 until length()).map { getJSONObject(it) }
private fun JSONObject.children() = optJSONArray("children")?.objects().orEmpty()
fun richText(text: String) = JSONArray().put(JSONObject().put("type", "text").put("text", JSONObject().put("content", text)))
fun plainText(parts: JSONArray?): String = parts?.objects()?.joinToString("") {
    it.optString("plain_text", it.optJSONObject("text")?.optString("content").orEmpty())
}.orEmpty().replace(Regex("\\s+"), " ").trim()
private fun JSONObject.text(): String = plainText(optJSONObject(optString("type"))?.optJSONArray("rich_text"))
private fun section(text: String): String? = sections.find {
    Regex("(^|\\s)${Regex.escape(it)}(\\s|$)", RegexOption.IGNORE_CASE)
        .containsMatchIn(text.replace(Regex("[\\\\\\[\\]()*_`]"), " ").trim())
}
private fun JSONObject.section(): String? = section(text()) ?: children().firstNotNullOfOrNull { it.section() }

fun courseFromNotion(id: String, title: String, blocks: List<JSONObject>): Course {
    val days = sortedMapOf<String, List<Card>>()
    val sentences = sortedMapOf<String, String>()
    fun leafTexts(block: JSONObject): List<String> {
        val text = block.text()
        val own = if (text.isNotBlank() && !dayPattern.containsMatchIn(text) && section(text) == null) listOf(text) else emptyList()
        return own + block.children().flatMap(::leafTexts)
    }
    fun pairs(block: JSONObject, section: String, day: String): List<Card> {
        if (block.optString("type") != "column_list") return block.children().flatMap { pairs(it, section, day) }
        val columns = block.children().filter { it.optString("type") == "column" }.map(::leafTexts)
        require(columns.size == 2) { "$day 학습 열 구조가 바뀌었습니다. 기존 자료를 유지합니다." }
        require(columns[0].size == columns[1].size) { "$day 한국어·영어 문장 개수가 다릅니다. Notion 원문을 확인해주세요." }
        return columns[0].zip(columns[1]).map { Card(it.first, it.second, section) }
    }
    fun visit(block: JSONObject) {
        val text = block.text()
        val dayMatch = dayPattern.find(text)
        if (Regex("Day\\s*00x", RegexOption.IGNORE_CASE).containsMatchIn(text)) return
        if (dayMatch == null) { block.children().forEach(::visit); return }
        val day = "Day ${dayMatch.groupValues[1].toInt().toString().padStart(3, '0')}"
        val cards = mutableListOf<Card>()
        var currentSection: String? = null
        for (child in block.children()) {
            currentSection = child.section() ?: currentSection
            if (currentSection != null) cards += pairs(child, currentSection, day)
        }
        if (cards.isEmpty()) return
        require(day !in days) { "Notion에 $day 항목이 둘 이상 있습니다. 원문을 확인해주세요." }
        days[day] = cards
        sentences[day] = text.substring(dayMatch.range.last + 1).trimStart(' ', '-', ':', '.')
            .ifBlank { cards.first().answer }
    }
    blocks.forEach(::visit)
    require(days.isNotEmpty()) { "$title 원문에서 유효한 Day 학습 자료를 찾지 못했습니다." }
    return Course(id, title, days, sentences)
}

fun encodeCourses(courses: List<Course>): String {
    val data = JSONObject()
    courses.forEach { course ->
        val days = JSONObject()
        course.days.forEach { (day, cards) -> days.put(day, JSONArray().apply {
            cards.forEach { put(JSONObject().put("q", it.question).put("a", it.answer).put("section", it.section)) }
        }) }
        data.put(course.id, JSONObject().put("title", course.title).put("data", days).put("dayMainSentences", JSONObject(course.sentences)))
    }
    return JSONObject().put("defaultCourse", "conversation").put("courses", data).toString()
}

data class ProgressRow(val key: String, val course: String, val day: String, val count: Int, val lastReviewed: String?, val completed: Boolean)

fun progressRows(values: Map<String, String>): List<ProgressRow> {
    val completed = completion(values)
    return listOf("conversation", "basic-verbs").flatMap { course ->
        val stats = reviews(values, course)
        val days = stats.keys().asSequence().toMutableSet()
        if (completed?.course == course) days += completed.day
        days.sorted().map { day ->
            val record = stats.optJSONObject(day)
            ProgressRow("$course:$day", course, day, record?.optInt("count") ?: 0,
                if (record == null || record.isNull("lastReviewed")) null else record.getString("lastReviewed"),
                completed == Chapter(course, day))
        }
    }
}

fun progressProperties(row: ProgressRow): JSONObject = JSONObject()
    .put("이름", JSONObject().put("title", richText("${if (row.course == "conversation") "영어회화" else "기본동사"} ${row.day}")))
    .put("키", JSONObject().put("rich_text", richText(row.key)))
    .put("코스", JSONObject().put("select", JSONObject().put("name", if (row.course == "conversation") "영어회화" else "기본동사")))
    .put("챕터", JSONObject().put("rich_text", richText(row.day)))
    .put("복습 횟수", JSONObject().put("number", row.count))
    .put("최근 복습", JSONObject().put("date", row.lastReviewed?.let {
        JSONObject().put("start", Instant.parse(it).truncatedTo(ChronoUnit.MILLIS).toString())
    } ?: JSONObject.NULL))
    .put("마지막 완료", JSONObject().put("checkbox", row.completed))

fun checkRemoteProgress(row: ProgressRow, remote: JSONObject) {
    val props = remote.getJSONObject("properties")
    val number = props.getJSONObject("복습 횟수").opt("number")
    require(number == JSONObject.NULL || number is Number && number.toDouble() in 0.0..1000000.0 && number.toDouble() % 1 == 0.0) {
        "Notion 복습 횟수가 올바르지 않아 전송을 중단했습니다."
    }
    val count = (number as? Number)?.toInt() ?: 0
    val date = props.getJSONObject("최근 복습").optJSONObject("date")?.optString("start")
    require(count <= row.count && (date.isNullOrEmpty() || row.lastReviewed != null &&
        !Instant.parse(date).truncatedTo(ChronoUnit.MILLIS).isAfter(Instant.parse(row.lastReviewed).truncatedTo(ChronoUnit.MILLIS)))) {
        "Notion의 ${row.day} 기록이 앱보다 많거나 최신입니다. 이전 기록으로 덮어쓰지 않았습니다."
    }
}
