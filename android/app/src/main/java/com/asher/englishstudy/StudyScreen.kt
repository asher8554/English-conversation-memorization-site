// 기존 카드 학습·음성 설정·복습 통계와 백업 이전을 네이티브 화면으로 제공한다.
package com.asher.englishstudy

import androidx.compose.foundation.clickable
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.selection.toggleable
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

@Composable
fun StudyScreen(model: StudyModel, onImport: () -> Unit, onExport: () -> Unit, onTtsSettings: () -> Unit, onOpenUrl: (String) -> Unit) {
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
                Column(Modifier.widthIn(max = 532.dp).fillMaxWidth().verticalScroll(rememberScrollState()).padding(horizontal = 16.dp, vertical = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(24.dp)) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(2.dp, Alignment.End), verticalAlignment = Alignment.CenterVertically) {
                        ToolButton("🔄", "Notion 자료와 진도 동기화") { dialog = "notion" }
                        ToolButton("📊", "복습 통계") { dialog = "stats" }
                        ToolButton("⚙️", "음성 설정과 기록 이전") { dialog = "settings" }
                        ToolButton(if (model.dark) "🌙" else "☀️", "다크 모드 전환") { model.setting("useDarkMode", (!model.dark).toString()) }
                        ToolButton("−", "글자 작게") { model.resize(-.2f) }
                        ToolButton("+", "글자 크게") { model.resize(.2f) }
                    }
                    GlassPanel(size, origin, model.dark) {
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            model.courses.forEach { course ->
                                val active = course.id == model.courseId
                                val bg = if (active && course.id == "basic-verbs") (if (model.dark) Color(0xFF8B2C18) else Color(0xFFF97316).copy(alpha = .78f))
                                    else if (active) Color.White.copy(alpha = .82f) else MaterialTheme.colorScheme.onSurface.copy(alpha = .08f)
                                val fg = if (active && course.id == "conversation") Color(0xFF12323A)
                                    else MaterialTheme.colorScheme.onSurface
                                OutlinedButton(onClick = { model.selectCourse(course.id) }, modifier = focusRing().weight(1f).height(44.dp).semantics { selected = active },
                                    shape = RoundedCornerShape(14.dp), colors = ButtonDefaults.outlinedButtonColors(containerColor = bg, contentColor = fg),
                                    border = BorderStroke(.75.dp, if (active && course.id == "basic-verbs") (if (model.dark) Color(0xFFB33D1B) else Color(0xFFEA580C)) else MaterialTheme.colorScheme.onSurface.copy(alpha = .20f))) {
                                    Text(course.title, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                                }
                            }
                        }
                        Spacer(Modifier.height(12.dp))
                        Text("${model.course.title} · ${model.course.days.size} Days", fontSize = 14.4.sp, lineHeight = 18.72.sp, modifier = Modifier.heightIn(min = 20.dp),
                            color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center)
                        Spacer(Modifier.height(12.dp))
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                            StudyButton("« 이전 챕터", Modifier.weight(1f), model.days.indexOf(model.day) > 0) { model.moveChapter(-1) }
                            StudyButton("다음 챕터 »", Modifier.weight(1f), model.days.indexOf(model.day) < model.days.lastIndex) { model.moveChapter(1) }
                        }
                        Spacer(Modifier.height(32.dp))
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(16.dp), verticalAlignment = Alignment.CenterVertically) {
                            OutlinedButton(onClick = { dialog = "days" }, modifier = focusRing().weight(1f).height(46.dp),
                                shape = RoundedCornerShape(12.dp), contentPadding = PaddingValues(horizontal = 12.dp, vertical = 12.dp),
                                border = BorderStroke(.75.dp, MaterialTheme.colorScheme.onSurface.copy(alpha = .20f)),
                                colors = ButtonDefaults.outlinedButtonColors(containerColor = MaterialTheme.colorScheme.onSurface.copy(alpha = .10f), contentColor = MaterialTheme.colorScheme.onSurface)) {
                                Text("${model.day} - ${model.course.sentences[model.day].orEmpty()}", maxLines = 1, overflow = TextOverflow.Ellipsis,
                                    textAlign = TextAlign.Start, modifier = Modifier.fillMaxWidth())
                            }
                            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                listOf("역순", "무작위").forEach { mode ->
                                    Row(Modifier.height(22.dp).toggleable(value = model.order == mode, role = Role.Checkbox,
                                        onValueChange = { model.sort(if (it) mode else "기본") })
                                        .semantics { contentDescription = "$mode 정렬" }, verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                        CompositionLocalProvider(LocalMinimumInteractiveComponentSize provides 0.dp) {
                                            Checkbox(checked = model.order == mode, onCheckedChange = null, modifier = Modifier.size(16.dp),
                                                colors = CheckboxDefaults.colors(uncheckedColor = MaterialTheme.colorScheme.onSurfaceVariant))
                                        }
                                        Text(mode, fontSize = 16.sp, lineHeight = 20.sp)
                                    }
                                }
                            }
                        }
                        Spacer(Modifier.height(20.dp))
                        if (model.card.section.isNotBlank()) {
                            Text(model.card.section, fontSize = 13.12.sp, lineHeight = 17.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.background(Color(0xFF6366F1).copy(alpha = .12f), CircleShape).padding(horizontal = 10.dp, vertical = 4.dp))
                            Spacer(Modifier.height(12.dp))
                        }
                        Text(model.card.question, fontSize = (model.questionSize * 16).sp, lineHeight = (model.questionSize * 20.8f).sp,
                            textAlign = TextAlign.Center, fontWeight = FontWeight.ExtraBold,
                            modifier = focusRing().fillMaxWidth().clickable(role = Role.Button, onClickLabel = "한국어 문장 다시 듣기") {
                                model.speech.speak(model.card.question, "ko", model.values)
                            }.padding(bottom = 24.dp))
                        if (model.revealed) {
                            Text(model.card.answer, fontSize = (model.answerSize * 16).sp, lineHeight = (model.answerSize * 20.8f).sp,
                                textAlign = TextAlign.Center, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.primary,
                                modifier = focusRing().fillMaxWidth().clickable(role = Role.Button, onClickLabel = "영어 문장 다시 듣기") {
                                    model.speech.speak(model.card.answer, "en", model.values)
                                }.padding(vertical = 12.dp))
                        } else Button(onClick = {
                            model.reveal()
                            if (model.flag("ttsAutoAnswer")) model.speech.speak(model.card.answer, "en", model.values)
                        }, modifier = focusRing().fillMaxWidth().height(44.dp), shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = if (model.dark) Color(0xFF20535F) else Color(0xFF087F8C),
                                contentColor = if (model.dark) MaterialTheme.colorScheme.onSurface else Color.White)) {
                            Text("Show Answer", fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
                        }
                        if (model.lastCard) {
                            Spacer(Modifier.height(16.dp))
                            Text(if (model.recorded) "복습을 기록했습니다. 다음 실행 시 이 챕터부터 시작합니다."
                                else "마지막 카드입니다. 복습 완료를 눌러 이번 학습을 기록하세요.", style = MaterialTheme.typography.bodyMedium)
                            Button(onClick = model::complete, enabled = !model.recorded,
                                modifier = focusRing().fillMaxWidth()) { Text(if (model.recorded) "기록 완료" else "복습 완료 · Review Complete") }
                        }
                        Row(Modifier.fillMaxWidth().padding(top = 32.dp, bottom = 20.dp), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                            StudyButton("« Prev", Modifier.weight(1f), model.canPrev) { model.moveCard(-1) }
                            StudyButton("Next »", Modifier.weight(1f), model.canNext) { model.moveCard(1) }
                        }
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
        "notion" -> NotionDialog(model, onOpenUrl) { dialog = "" }
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
private fun ToolButton(icon: String, label: String, click: () -> Unit) {
    Box(focusRing().size(48.dp).semantics { contentDescription = label }.clickable(role = Role.Button, onClick = click),
        contentAlignment = Alignment.Center) {
        Box(Modifier.size(40.dp).border(.75.dp, MaterialTheme.colorScheme.onSurface.copy(alpha = .20f), CircleShape)
            .background(MaterialTheme.colorScheme.onSurface.copy(alpha = .08f), CircleShape), contentAlignment = Alignment.Center) {
            Text(icon, fontSize = 24.sp, color = MaterialTheme.colorScheme.primary)
        }
    }
}

@Composable
private fun StudyButton(label: String, modifier: Modifier, enabled: Boolean, click: () -> Unit) {
    OutlinedButton(onClick = click, enabled = enabled, modifier = focusRing().then(modifier).height(44.dp), shape = RoundedCornerShape(12.dp),
        colors = ButtonDefaults.outlinedButtonColors(containerColor = MaterialTheme.colorScheme.onSurface.copy(alpha = .08f),
            contentColor = MaterialTheme.colorScheme.onSurface), border = BorderStroke(.75.dp, MaterialTheme.colorScheme.onSurface.copy(alpha = .20f))) {
        Text(label, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
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
