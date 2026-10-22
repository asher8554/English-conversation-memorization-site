// 기존 카드 학습·음성 설정·복습 통계와 백업 이전을 네이티브 화면으로 제공한다.
package com.asher.englishstudy

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

@Composable
fun StudyScreen(model: StudyModel, onImport: () -> Unit, onExport: () -> Unit, onTtsSettings: () -> Unit) {
    var dialog by rememberSaveable { mutableStateOf("") }
    val snackbar = remember { SnackbarHostState() }
    LaunchedEffect(model.notice) {
        if (model.notice.isNotEmpty()) {
            val message = model.notice
            model.notice = ""
            snackbar.showSnackbar(message, duration = SnackbarDuration.Long)
        }
    }
    LaunchedEffect(model.courseId, model.day, model.index, model.speech.ready) {
        if (model.speech.ready && model.flag("ttsAutoQuestion")) model.speech.speak(model.card.question, "ko", model.values)
    }
    Box(Modifier.fillMaxSize()) {
        GlassBackground(model.dark) { size, origin ->
            Box(Modifier.fillMaxSize().safeDrawingPadding(), contentAlignment = Alignment.TopCenter) {
                Column(Modifier.widthIn(max = 840.dp).fillMaxWidth().verticalScroll(rememberScrollState()).padding(20.dp),
                    verticalArrangement = Arrangement.spacedBy(18.dp)) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Column {
                            Text("DAILY PRACTICE", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.primary)
                            Text("English Study", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.SemiBold)
                        }
                        TextButton(onClick = { dialog = "settings" }, modifier = focusRing()) { Text("설정") }
                    }
                    GlassPanel(size, origin, model.dark) {
                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            model.courses.forEach { course ->
                                if (course.id == model.courseId) Button(onClick = {}, modifier = focusRing().weight(1f)) { Text(course.title) }
                                else OutlinedButton(onClick = { model.selectCourse(course.id) }, modifier = focusRing().weight(1f)) { Text(course.title) }
                            }
                        }
                        Text(model.course.sentences[model.day].orEmpty().ifEmpty { model.course.title }, style = MaterialTheme.typography.bodyLarge)
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            OutlinedButton(onClick = { model.moveChapter(-1) }, enabled = model.days.indexOf(model.day) > 0,
                                modifier = focusRing().weight(1f)) { Text("이전 챕터") }
                            OutlinedButton(onClick = { model.moveChapter(1) }, enabled = model.days.indexOf(model.day) < model.days.lastIndex,
                                modifier = focusRing().weight(1f)) { Text("다음 챕터") }
                        }
                        OutlinedButton(onClick = { dialog = "days" }, modifier = focusRing().fillMaxWidth()) {
                            Text("${model.day}  ·  챕터 선택", style = MaterialTheme.typography.titleMedium)
                        }
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                            listOf("기본", "역순", "무작위").forEach { label ->
                                FilterChip(selected = model.order == label, onClick = { model.sort(label) }, label = { Text(label) }, modifier = focusRing())
                            }
                        }
                    }
                    GlassPanel(size, origin, model.dark) {
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(model.card.section.ifBlank { "문장 연습" }, style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary)
                            Text("${model.index + 1} / ${model.cards.size}", style = MaterialTheme.typography.labelLarge)
                        }
                        Text(model.card.question, fontSize = (model.questionSize * 16).sp, lineHeight = (model.questionSize * 23).sp,
                            modifier = focusRing().fillMaxWidth().clickable(role = Role.Button, onClickLabel = "한국어 문장 다시 듣기") {
                                model.speech.speak(model.card.question, "ko", model.values)
                            }.padding(vertical = 16.dp))
                        if (model.revealed) {
                            HorizontalDivider(color = MaterialTheme.colorScheme.onSurface.copy(alpha = .18f))
                            Text(model.card.answer, fontSize = (model.answerSize * 16).sp, lineHeight = (model.answerSize * 24).sp,
                                modifier = focusRing().fillMaxWidth().clickable(role = Role.Button, onClickLabel = "영어 문장 다시 듣기") {
                                    model.speech.speak(model.card.answer, "en", model.values)
                                }.padding(vertical = 12.dp))
                        } else Button(onClick = {
                            model.reveal()
                            if (model.flag("ttsAutoAnswer")) model.speech.speak(model.card.answer, "en", model.values)
                        }, modifier = focusRing().fillMaxWidth().heightIn(min = 52.dp)) { Text("정답 보기 · Show Answer") }
                        if (model.lastCard) {
                            Text(if (model.recorded) "복습을 기록했습니다. 다음 실행 시 이 챕터부터 시작합니다."
                                else "마지막 카드입니다. 복습 완료를 눌러 이번 학습을 기록하세요.", style = MaterialTheme.typography.bodyMedium)
                            Button(onClick = model::complete, enabled = !model.recorded,
                                modifier = focusRing().fillMaxWidth()) { Text(if (model.recorded) "기록 완료" else "복습 완료 · Review Complete") }
                        }
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            OutlinedButton(onClick = { model.moveCard(-1) }, enabled = model.canPrev,
                                modifier = focusRing().weight(1f).heightIn(min = 50.dp)) { Text("이전 · Prev") }
                            OutlinedButton(onClick = { model.moveCard(1) }, enabled = model.canNext,
                                modifier = focusRing().weight(1f).heightIn(min = 50.dp)) { Text("다음 · Next") }
                        }
                    }
                    GlassPanel(size, origin, model.dark) {
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                            TextButton(onClick = { dialog = "stats" }, modifier = focusRing()) { Text("복습 통계") }
                            TextButton(onClick = { dialog = "notion" }, modifier = focusRing()) { Text("Notion 동기화") }
                        }
                        Text("저장된 자료로 오프라인 학습 중", style = MaterialTheme.typography.bodySmall)
                    }
                }
            }
        }
        SnackbarHost(snackbar, Modifier.align(Alignment.BottomCenter).safeDrawingPadding())
    }

    when (dialog) {
        "days" -> AlertDialog(onDismissRequest = { dialog = "" }, title = { Text("챕터 선택") }, text = {
            LazyColumn(Modifier.heightIn(max = 420.dp)) {
                items(model.days) { day ->
                    TextButton(onClick = { model.selectDay(day); dialog = "" }, modifier = focusRing().fillMaxWidth()) {
                        Text("$day  ${model.course.sentences[day].orEmpty()}", modifier = Modifier.fillMaxWidth())
                    }
                }
            }
        }, confirmButton = { TextButton(onClick = { dialog = "" }) { Text("닫기") } })
        "settings" -> SettingsDialog(model, onImport, onExport, onTtsSettings) { dialog = "" }
        "stats" -> StatsDialog(model, onReset = { dialog = "reset" }) { dialog = "" }
        "reset" -> AlertDialog(onDismissRequest = { dialog = "stats" }, title = { Text("${model.course.title} 복습 통계를 초기화할까요?") },
            text = { Text("이 코스의 복습 횟수와 최근 복습 시각이 지워집니다. 먼저 설정에서 기록 백업을 저장할 수 있습니다.") },
            confirmButton = { TextButton(onClick = { model.resetCurrentStats(); dialog = "stats" }) { Text("초기화") } },
            dismissButton = { TextButton(onClick = { dialog = "stats" }) { Text("취소") } })
        "notion" -> AlertDialog(onDismissRequest = { dialog = "" }, title = { Text("Notion 동기화") },
            text = { Text("현재는 오프라인 학습과 기록 이전을 검증하는 Phase 1입니다. Notion 자료 갱신과 진도 전송은 다음 단계에서 연결합니다.") },
            confirmButton = { TextButton(onClick = { dialog = "" }) { Text("닫기") } })
    }
    model.pendingImport?.let { incoming ->
        val total = listOf("conversation", "basic-verbs").sumOf { id ->
            val stats = reviews(incoming, id)
            stats.keys().asSequence().sumOf { stats.getJSONObject(it).getInt("count") }
        }
        AlertDialog(onDismissRequest = model::cancelImport, title = { Text("브라우저 기록 가져오기") },
            text = { Text("${incoming.size}개 설정·기록, 총 ${total}회 복습 기록을 가져옵니다. 같은 항목은 파일의 값으로 바뀝니다. 현재 앱 기록은 내부 백업으로 보관하고 삼성 인터넷의 원본은 유지합니다.") },
            confirmButton = { TextButton(onClick = model::confirmImport) { Text("가져오기") } },
            dismissButton = { TextButton(onClick = model::cancelImport) { Text("취소") } })
    }
}

@Composable
private fun SettingsDialog(model: StudyModel, onImport: () -> Unit, onExport: () -> Unit, onTtsSettings: () -> Unit, close: () -> Unit) {
    AlertDialog(onDismissRequest = close, title = { Text("학습 설정") }, text = {
        Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            SettingSwitch("다크 모드", model.dark) { model.setting("useDarkMode", it.toString()) }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text("글자 크기")
                OutlinedButton(onClick = { model.resize(-.2f) }, enabled = model.questionSize > 1.01f) { Text("A−") }
                OutlinedButton(onClick = { model.resize(.2f) }, enabled = model.questionSize < 3.99f) { Text("A+") }
            }
            SettingSwitch("질문 자동 읽기", model.flag("ttsAutoQuestion")) { model.setting("ttsAutoQuestion", it.toString()) }
            SettingSwitch("정답 자동 읽기", model.flag("ttsAutoAnswer")) { model.setting("ttsAutoAnswer", it.toString()) }
            listOf("ko" to "한국어", "en" to "영어").forEach { (lang, label) ->
                val key = "tts${if (lang == "ko") "Ko" else "En"}Rate"
                val rate = model.rate(key, if (lang == "ko") 1f else .9f)
                Text("$label 속도 · ${"%.2f".format(rate)}×")
                Slider(value = rate, onValueChange = { model.setting(key, (kotlin.math.round(it * 20) / 20).toString()) },
                    valueRange = .7f..1.2f, steps = 9)
                VoicePicker(model, lang, label)
            }
            Text("오프라인 사용 가능한 음성만 표시합니다. 이전 목소리가 없으면 설치된 같은 언어 음성으로 재생합니다.", style = MaterialTheme.typography.bodySmall)
            OutlinedButton(onClick = {
                model.speech.speak("안녕하세요. 한국어 목소리 테스트입니다.", "ko", model.values)
                model.speech.speak("Hello, this is an English voice test.", "en", model.values, queued = true)
            }, modifier = Modifier.fillMaxWidth()) { Text("목소리 테스트") }
            TextButton(onClick = onTtsSettings) { Text("기기 음성 설정 · 음성 데이터 설치") }
            HorizontalDivider()
            OutlinedButton(onClick = { close(); onImport() }, modifier = Modifier.fillMaxWidth()) { Text("브라우저 기록 가져오기") }
            OutlinedButton(onClick = onExport, modifier = Modifier.fillMaxWidth()) { Text("현재 앱 기록 백업") }
        }
    }, confirmButton = { TextButton(onClick = close) { Text("저장하고 닫기") } })
}

@Composable
private fun SettingSwitch(label: String, checked: Boolean, change: (Boolean) -> Unit) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
        Text(label, modifier = Modifier.weight(1f))
        Switch(checked = checked, onCheckedChange = change)
    }
}

@Composable
private fun VoicePicker(model: StudyModel, lang: String, label: String) {
    var expanded by remember { mutableStateOf(false) }
    val voices = model.speech.forLanguage(lang)
    val selected = voices.find { it.name == model.values["${lang}VoiceURI"] }
    Box {
        OutlinedButton(onClick = { expanded = true }, enabled = voices.isNotEmpty(), modifier = Modifier.fillMaxWidth()) {
            Text(selected?.name ?: if (voices.isEmpty()) "$label 오프라인 음성 없음" else "$label 기본 음성 · 변경")
        }
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            voices.forEach { voice -> DropdownMenuItem(text = { Text("${voice.name} (${voice.locale.toLanguageTag()})") },
                onClick = { model.setting("${lang}VoiceURI", voice.name); expanded = false }) }
        }
    }
}

@Composable
private fun StatsDialog(model: StudyModel, onReset: () -> Unit, close: () -> Unit) {
    val stats = reviews(model.values, model.courseId)
    val count = stats.keys().asSequence().sumOf { stats.getJSONObject(it).optInt("count") }
    AlertDialog(onDismissRequest = close, title = { Text("${model.course.title} 복습 통계 · $count 회") }, text = {
        LazyColumn(Modifier.heightIn(max = 420.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            items(model.course.days.keys.toList()) { day ->
                val entry = stats.optJSONObject(day)
                val time = entry?.optString("lastReviewed")?.takeIf { it != "null" && it.isNotBlank() }?.let {
                    DateTimeFormatter.ofPattern("yyyy.MM.dd HH:mm").withZone(ZoneId.systemDefault()).format(Instant.parse(it))
                } ?: "아직 복습하지 않았습니다."
                Column {
                    Text("$day   ${entry?.optInt("count") ?: 0} 회", style = MaterialTheme.typography.titleSmall)
                    Text(time, style = MaterialTheme.typography.bodySmall)
                }
            }
        }
    }, confirmButton = { TextButton(onClick = close) { Text("닫기") } },
        dismissButton = { TextButton(onClick = onReset) { Text("이 코스 통계 초기화") } })
}
