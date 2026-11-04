// 카드 경계 이동과 복습 기록·백업의 손상 방지를 검증한다.
package com.asher.englishstudy

import org.junit.Assert.*
import org.junit.Test
import org.json.JSONObject
import java.time.Instant

class StudyDataTest {
    private val now = Instant.parse("2026-10-22T02:00:00Z")
    private val chapter = Chapter("basic-verbs", "Day 002")

    @Test fun `review completion increments only the selected course and preserves settings`() {
        val original = mapOf("ttsEnRate" to "0.9", "reviewStats:conversation" to "{\"Day 001\":{\"count\":3,\"lastReviewed\":null}}")
        val next = incrementReview(original, chapter, now)
        assertEquals(1, reviews(next, chapter.course).getJSONObject(chapter.day).getInt("count"))
        assertEquals(3, reviews(next, "conversation").getJSONObject("Day 001").getInt("count"))
        assertEquals("0.9", next["ttsEnRate"])
        assertEquals(chapter, completion(next))
        assertFalse(original.containsKey("lastCompletedChapter"))
        assertEquals(2, reviews(incrementReview(next, chapter, now), chapter.course).getJSONObject(chapter.day).getInt("count"))
    }

    @Test fun `backup round trip retains legacy statistics and voice preferences`() {
        val values = incrementReview(mapOf("koVoiceName" to "Samsung 한국어", "useDarkMode" to "false",
            "reviewStats" to "{\"Day 001\":{\"count\":2,\"lastReviewed\":null}}"), chapter, now)
        assertEquals(values, readBackup(writeBackup(values)))
        assertEquals(2, reviews(values, "conversation").getJSONObject("Day 001").getInt("count"))
    }

    @Test fun `bad records and unknown keys are rejected before mutation`() {
        val badValues = listOf(
            mapOf("NOTION_TOKEN" to "never-import"), mapOf("ttsEnRate" to "NaN"),
            mapOf("questionFontSize" to "Infinity"), mapOf("useDarkMode" to "yes"),
            mapOf("reviewStats:conversation" to "{\"Day 001\":{\"count\":-1,\"lastReviewed\":null}}"),
            mapOf("reviewStats:conversation" to "{\"Day 001\":{\"count\":1.5,\"lastReviewed\":null}}"),
            mapOf("reviewStats:conversation" to "{\"Day 001\":{\"count\":1,\"lastReviewed\":\"invalid\"}}"),
            mapOf("lastCompletedChapter" to "{\"courseId\":\"unknown\",\"day\":\"Day 001\"}")
        )
        badValues.forEach { values ->
            assertThrows(Exception::class.java) { readBackup(writeBackup(values)) }
        }
        assertThrows(Exception::class.java) { readBackup("{}") }
        assertThrows(Exception::class.java) { readBackup(" ".repeat(1048577)) }
        assertThrows(Exception::class.java) { readBackup(writeBackup(emptyMap())) }
    }

    @Test fun `next and previous cross chapter boundaries and obey the current day order`() {
        val card = Card("질문", "Answer", "")
        val cards = mapOf("Day 001" to listOf(card, card), "Day 002" to listOf(card))
        val days = cards.keys.toList()
        assertEquals("Day 001" to 0, adjacentCard(days, cards, "Day 001", 0, -1))
        assertEquals("Day 002" to 0, adjacentCard(days, cards, "Day 001", 1, 1))
        assertEquals("Day 001" to 1, adjacentCard(days, cards, "Day 002", 0, -1))
        assertEquals("Day 002" to 0, adjacentCard(days, cards, "Day 002", 0, 1))
        assertEquals("Day 001" to 0, adjacentCard(days.reversed(), cards, "Day 002", 0, 1))
    }

    @Test fun `data loader requires both courses and populated pairs`() {
        val course = JSONObject().put("title", "영어").put("data", JSONObject().put("Day 001",
            org.json.JSONArray().put(JSONObject().put("q", "질문").put("a", "Answer").put("section", "Small talk"))))
        val source = JSONObject().put("courses", JSONObject().put("conversation", course).put("basic-verbs", course))
        val parsed = parseCourses(source.toString())
        assertEquals("Small talk", parsed.first().days.getValue("Day 001").first().section)
        course.getJSONObject("data").getJSONArray("Day 001").getJSONObject(0).put("a", " ")
        assertThrows(Exception::class.java) { parseCourses(source.toString()) }
    }

    @Test fun `forgot counter accumulates per sentence, resets only that sentence and survives backup`() {
        val a = Card("나는 시카고에 친구가 있다.", "I have friends in Chicago.", "Model Examples")
        val b = Card("내 조카는 거북이를 키운다.", "My nephew has a turtle.", "Model Examples")
        var values = mapOf("ttsEnRate" to "0.9")
        repeat(3) { values = incrementForgot(values, "basic-verbs", "Day 001", a) }
        values = incrementForgot(values, "basic-verbs", "Day 001", b)
        assertEquals(3, forgotCount(values, "basic-verbs", "Day 001", a))
        assertEquals(0, forgotCount(values, "conversation", "Day 001", a))
        assertEquals(values, readBackup(writeBackup(values)))
        values = resetForgot(values, "basic-verbs", "Day 001", a)
        assertEquals(0, forgotCount(values, "basic-verbs", "Day 001", a))
        assertEquals(1, forgotCount(values, "basic-verbs", "Day 001", b))
        assertEquals("0.9", values["ttsEnRate"])
        assertThrows(IllegalArgumentException::class.java) { validateValues(JSONObject().put("forgotCounts:conversation", "{\"Day 001|x\":0}")) }
        assertThrows(IllegalArgumentException::class.java) { validateValues(JSONObject().put("forgotCounts:conversation", "{\"bad\":1}")) }
    }

    @Test fun `speech toggle is a backed up boolean setting`() {
        assertEquals("false", readBackup(writeBackup(mapOf("speechEnabled" to "false")))["speechEnabled"])
        assertThrows(IllegalArgumentException::class.java) { validateValues(JSONObject().put("speechEnabled", "off")) }
    }
}
