// Notion 원문을 읽고 전용 데이터베이스에 챕터별 진도를 수동 전송한다.
package com.asher.englishstudy

import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URI
import java.net.URLEncoder
import java.util.UUID

class NotionClient(private val token: String, private val report: (String) -> Unit) {
    private var lastRequestAt = 0L
    private var blockCount = 0
    private var receivedBytes = 0
    private fun id(value: String) = UUID.fromString(value).toString()

    private fun request(path: String, method: String = "GET", body: JSONObject? = null): JSONObject {
        // 생성 요청은 응답이 끊기면 결과가 불확실하므로 자동으로 반복하지 않는다.
        val readOnly = method == "GET" || path.endsWith("/query")
        for (attempt in 0..2) {
            Thread.sleep(maxOf(0, 350 - (System.currentTimeMillis() - lastRequestAt)))
            val connection = URI("https://api.notion.com/v1/$path").toURL().openConnection() as HttpURLConnection
            var retryMs = 1000L shl attempt
            try {
                lastRequestAt = System.currentTimeMillis()
                connection.requestMethod = method
                connection.instanceFollowRedirects = false
                connection.connectTimeout = 15000
                connection.readTimeout = 30000
                connection.setRequestProperty("Authorization", "Bearer $token")
                connection.setRequestProperty("Notion-Version", "2025-09-03")
                connection.setRequestProperty("Content-Type", "application/json; charset=utf-8")
                if (body != null) {
                    connection.doOutput = true
                    connection.outputStream.use { it.write(body.toString().toByteArray(Charsets.UTF_8)) }
                }
                val status = connection.responseCode
                if (status !in 200..299) {
                    val bytes = connection.errorStream?.use { it.readNBytes(65536) }
                    val apiError = runCatching { JSONObject(bytes?.toString(Charsets.UTF_8) ?: "{}") }.getOrNull()
                    if (status in setOf(429, 529) && apiError?.optJSONObject("additional_data")?.optString("rate_limit_reason") != "public_api_request_blocked") {
                        val seconds = connection.getHeaderField("Retry-After")?.toLongOrNull()
                        if (seconds != null) retryMs = maxOf(retryMs, seconds.coerceAtLeast(1) * 1000)
                        if (retryMs > 120000) error("Notion의 대기 시간이 깁니다. 잠시 후 수동으로 다시 시도해주세요.")
                        if (attempt < 2) { report("Notion 요청 제한으로 ${retryMs / 1000}초 뒤 다시 시도합니다."); Thread.sleep(retryMs); continue }
                    }
                    if (readOnly && status in setOf(500, 502, 503, 504)) throw IOException("Notion 서버 응답 오류 ($status)")
                    error(when (status) {
                        401 -> "Notion 연결 키가 올바르지 않습니다. 다시 입력해주세요."
                        403, 404 -> "Notion 접근 권한을 확인해주세요. 두 교재와 영어 학습 진도 DB에 같은 integration을 연결해야 합니다."
                        429, 529 -> "Notion 요청이 제한됐습니다. 잠시 후 다시 시도해주세요."
                        else -> "Notion 요청에 실패했습니다 ($status). 일부 진도 전송은 완료됐을 수 있으므로 다시 조회 후 시도해주세요."
                    })
                }
                val bytes = connection.inputStream.use { it.readNBytes(8388609) }
                receivedBytes += bytes.size
                require(bytes.size <= 8388608) { "Notion 응답이 너무 큽니다. 기존 자료를 유지합니다." }
                require(receivedBytes <= 67108864) { "Notion 조회 크기가 너무 큽니다. 기존 자료를 유지합니다." }
                return JSONObject(bytes.toString(Charsets.UTF_8))
            } catch (e: IOException) {
                if (!readOnly || attempt == 2) error(if (readOnly) "Notion 연결이 끊겼거나 응답 시간이 초과됐습니다. 기존 자료와 앱 진도를 유지합니다."
                    else "진도 전송 결과를 확인하지 못했습니다. 다음 전송에서 Notion을 재조회합니다. 이미 전송된 기록은 유지합니다.")
                report("일시적인 연결 오류로 다시 조회합니다. ${attempt + 1}/2")
                Thread.sleep(retryMs)
            } finally { connection.disconnect() }
        }
        error("Notion 요청을 완료하지 못했습니다.")
    }

    private fun readChildren(blockId: String, depth: Int = 0): List<JSONObject> {
        require(depth <= 30) { "Notion 중첩 구조가 너무 깊습니다." }
        val blocks = mutableListOf<JSONObject>()
        var cursor: String? = null
        do {
            val suffix = cursor?.let { "&start_cursor=${URLEncoder.encode(it, "UTF-8")}" }.orEmpty()
            val page = request("blocks/${id(blockId)}/children?page_size=100$suffix")
            val items = page.getJSONArray("results").objects()
            blockCount += items.size
            require(blockCount <= 50000) { "조회할 Notion 블록이 너무 많습니다. 기존 자료를 유지합니다." }
            report("학습 자료를 읽고 있습니다. ${blockCount}개 블록 확인")
            for (block in items) {
                if (block.optBoolean("has_children")) block.put("children", org.json.JSONArray(readChildren(block.getString("id"), depth + 1)))
                blocks += block
            }
            cursor = if (page.optBoolean("has_more")) page.getString("next_cursor") else null
        } while (cursor != null)
        return blocks
    }

    fun fetchCourses(existing: List<Course>): List<Course> = existing.map { course ->
        report("${course.title} 원문을 조회합니다.")
        courseFromNotion(course.id, course.title, readChildren(notionSources.getValue(course.id)))
    }.also { parseCourses(encodeCourses(it)) }

    private fun existingProgress(): Map<String, JSONObject> {
        val rows = mutableMapOf<String, JSONObject>()
        var cursor: String? = null
        do {
            val body = JSONObject().put("page_size", 100)
            if (cursor != null) body.put("start_cursor", cursor)
            val page = request("data_sources/$PROGRESS_SOURCE_ID/query", "POST", body)
            for (row in page.getJSONArray("results").objects()) {
                val key = plainText(row.getJSONObject("properties").getJSONObject("키").getJSONArray("rich_text"))
                if (!key.matches(Regex("(conversation|basic-verbs):Day \\d{3}"))) continue
                require(key !in rows) { "Notion 진도 DB에 같은 챕터가 중복되어 있습니다. 전송 전에 확인해주세요." }
                rows[key] = row
            }
            require(rows.size <= 2000) { "Notion 진도 항목 수가 예상 범위를 넘었습니다." }
            cursor = if (page.optBoolean("has_more")) page.getString("next_cursor") else null
        } while (cursor != null)
        return rows
    }

    fun sendProgress(values: Map<String, String>): Int {
        validateValues(JSONObject(values))
        val rows = progressRows(values)
        if (rows.isEmpty()) return 0
        val existing = existingProgress()
        val completed = completion(values)
        rows.forEach { row -> existing[row.key]?.let { checkRemoteProgress(row, it) } }
        for ((index, row) in rows.sortedByDescending { it.completed }.withIndex()) {
            report("학습 진도를 전송합니다. ${index + 1}/${rows.size}")
            val old = existing[row.key]
            val properties = progressProperties(row)
            if (completed == null) properties.remove("마지막 완료")
            if (old != null) request("pages/${id(old.getString("id"))}", "PATCH", JSONObject().put("properties", properties))
            else request("pages", "POST", JSONObject().put("parent", JSONObject().put("type", "data_source_id").put("data_source_id", PROGRESS_SOURCE_ID))
                .put("properties", properties))
        }
        if (completed != null) {
            val target = "${completed.course}:${completed.day}"
            for ((key, row) in existing) {
                if (key != target && row.getJSONObject("properties").getJSONObject("마지막 완료").optBoolean("checkbox")) {
                    request("pages/${id(row.getString("id"))}", "PATCH", JSONObject().put("properties",
                        JSONObject().put("마지막 완료", JSONObject().put("checkbox", false))))
                }
            }
        }
        val verified = existingProgress()
        rows.forEach { row ->
            val saved = verified[row.key]?.getJSONObject("properties") ?: error("전송한 진도를 다시 확인하지 못했습니다. 잠시 후 다시 시도해주세요.")
            val actualDate = saved.getJSONObject("최근 복습").optJSONObject("date")?.optString("start")
            val expectedFlag = if (completed != null) row.completed else
                existing[row.key]?.getJSONObject("properties")?.getJSONObject("마지막 완료")?.optBoolean("checkbox") ?: false
            check(saved.getJSONObject("복습 횟수").getInt("number") == row.count &&
                saved.getJSONObject("마지막 완료").getBoolean("checkbox") == expectedFlag &&
                (if (row.lastReviewed == null) actualDate == null else actualDate != null &&
                    java.time.Instant.parse(actualDate).truncatedTo(java.time.temporal.ChronoUnit.MILLIS) ==
                    java.time.Instant.parse(row.lastReviewed).truncatedTo(java.time.temporal.ChronoUnit.MILLIS))) {
                "전송한 진도가 일치하지 않습니다. 다시 확인해주세요."
            }
        }
        return rows.size
    }
}
