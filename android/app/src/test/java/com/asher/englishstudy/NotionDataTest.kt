// Notion 교재 변환과 진도 전송의 데이터 보존 규칙을 검사한다.
package com.asher.englishstudy

import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import java.time.Instant

class NotionDataTest {
    private fun block(type: String, text: String = "", children: List<JSONObject> = emptyList()): JSONObject = JSONObject()
        .put("type", type).put(type, JSONObject().put("rich_text", richText(text))).put("children", JSONArray(children))
    private fun columns(left: List<String>, right: List<String>) = block("column_list", children = listOf(
        block("column", children = left.map { block("paragraph", it) }),
        block("column", children = right.map { block("paragraph", it) })))

    @Test fun `both textbooks retain labelled examples and conversations without duplicating first pair`() {
        val blocks = listOf(block("heading_2", "Day001 [Have] : Do you have any pets?", listOf(
            columns(listOf("[Model Examples]", "내 조카는 거북이를 키운다.", "나는 시카고에 친구가 있다."),
                listOf("", "My nephew has a turtle.", "I have friends in Chicago.")),
            columns(listOf("[Small talk]", "음대 대신 의대를 선택했지?"), listOf("", "You chose med school over music, right?")),
            columns(listOf("응, 힘든 결정이었어."), listOf("Yeah, it was a tough decision.")),
            columns(listOf("[Further Studies]", "나는 가격보다 품질을 중시한다."), listOf("", "I choose quality over price."))
        )), block("heading_2", "Day00x 템플릿", listOf(columns(listOf("질문"), listOf("Ignore")))))
        listOf("conversation", "basic-verbs").forEach { id ->
            val course = courseFromNotion(id, "교재", blocks)
            val cards = course.days.getValue("Day 001")
            assertEquals(5, cards.size)
            assertEquals(listOf("Model Examples", "Model Examples", "Small talk", "Small talk", "Further Studies"), cards.map { it.section })
            assertEquals("내 조카는 거북이를 키운다.", cards.first().question)
            assertEquals("[Have] : Do you have any pets?", course.sentences["Day 001"])
        }
        val courses = listOf("conversation", "basic-verbs").map { courseFromNotion(it, "교재", blocks) }
        assertEquals(courses, parseCourses(encodeCourses(courses)))
    }

    @Test fun `ambiguous or empty source fails instead of replacing saved course`() {
        val mismatched = block("heading_2", "Day 001", listOf(columns(listOf("Model Examples", "질문"), listOf("Answer", "Extra answer"))))
        assertThrows(IllegalArgumentException::class.java) { courseFromNotion("conversation", "교재", listOf(mismatched)) }
        assertThrows(IllegalArgumentException::class.java) { courseFromNotion("conversation", "교재", emptyList()) }
        val valid = block("heading_2", "Day 001", listOf(columns(listOf("Model Examples", "질문"), listOf("Answer"))))
        assertThrows(IllegalArgumentException::class.java) { courseFromNotion("conversation", "교재", listOf(valid, valid)) }
    }

    @Test fun `progress payload uses stable keys and absolute counts for repeat sends`() {
        val values = incrementReview(emptyMap(), Chapter("basic-verbs", "Day 002"), Instant.parse("2026-10-22T02:00:00Z"))
        val row = progressRows(values).single()
        assertEquals("basic-verbs:Day 002", row.key)
        val first = progressProperties(row)
        val again = progressProperties(row)
        assertEquals(first.toString(), again.toString())
        assertEquals(1, first.getJSONObject("복습 횟수").getInt("number"))
        assertTrue(first.getJSONObject("마지막 완료").getBoolean("checkbox"))
        val remote = JSONObject().put("properties", first)
        checkRemoteProgress(row, remote)
        first.getJSONObject("복습 횟수").put("number", 2)
        assertThrows(IllegalArgumentException::class.java) { checkRemoteProgress(row, remote) }
        first.getJSONObject("복습 횟수").put("number", 1.5)
        assertThrows(IllegalArgumentException::class.java) { checkRemoteProgress(row, remote) }
    }

    @Test fun `newer remote timestamps are protected and completion without statistics can be saved`() {
        val row = ProgressRow("conversation:Day 001", "conversation", "Day 001", 2, "2026-10-22T02:00:00Z", false)
        val props = progressProperties(row)
        props.getJSONObject("최근 복습").getJSONObject("date").put("start", "2026-10-22T03:00:00Z")
        assertThrows(IllegalArgumentException::class.java) { checkRemoteProgress(row, JSONObject().put("properties", props)) }
        val values = mapOf("lastCompletedChapter" to "{\"courseId\":\"conversation\",\"day\":\"Day 001\"}")
        assertEquals(0, progressRows(values).single().count)
        assertTrue(progressRows(values).single().completed)
    }

    @Test fun `review timestamps use Notion compatible milliseconds`() {
        val values = incrementReview(emptyMap(), Chapter("conversation", "Day 001"), Instant.parse("2026-10-22T02:00:00.123456789Z"))
        assertEquals("2026-10-22T02:00:00.123Z", reviews(values, "conversation").getJSONObject("Day 001").getString("lastReviewed"))
        val row = ProgressRow("conversation:Day 001", "conversation", "Day 001", 1, "2026-10-22T02:00:00.123456789Z", false)
        val props = progressProperties(row)
        assertEquals("2026-10-22T02:00:00.123Z", props.getJSONObject("최근 복습").getJSONObject("date").getString("start"))
        checkRemoteProgress(row, JSONObject().put("properties", props))
    }
}
