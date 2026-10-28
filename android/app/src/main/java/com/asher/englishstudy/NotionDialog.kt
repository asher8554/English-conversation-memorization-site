// Notion 연결 키 입력과 수동 자료 갱신·진도 전송 상태를 표시한다.
package com.asher.englishstudy

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

@Composable
fun NotionDialog(model: StudyModel, openUrl: (String) -> Unit, close: () -> Unit) {
    var token by remember { mutableStateOf("") }
    val previousDataSync = rememberSaveable { model.connection.dataSyncedAt }
    LaunchedEffect(model.syncing) {
        if (!model.syncing && model.connection.dataSyncedAt != previousDataSync) close()
    }
    fun time(value: String) = if (value.isBlank()) "아직 없음" else runCatching {
        DateTimeFormatter.ofPattern("yyyy.MM.dd HH:mm").withZone(ZoneId.systemDefault()).format(Instant.parse(value))
    }.getOrDefault("확인 필요")
    AlertDialog(onDismissRequest = close, title = { Text("Notion 동기화") }, text = {
        // Compose Dialog는 Activity와 별도 창이므로 화면 유지 플래그도 따로 설정한다.
        KeepScreenOn()
        Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("영어회화·기본동사 자료를 가져오고 복습 진도를 보냅니다. 버튼을 누를 때만 인터넷에 연결합니다.")
            Text(if (model.connectionConfigured) "연결 키 저장됨 · 동기화로 접근 권한을 확인하세요." else "처음 한 번 Notion integration 키를 입력해주세요.",
                style = MaterialTheme.typography.bodySmall)
            OutlinedTextField(value = token, onValueChange = { token = it }, label = { Text("Notion integration 키") },
                visualTransformation = PasswordVisualTransformation(), singleLine = true, enabled = !model.syncing,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password), modifier = Modifier.fillMaxWidth())
            OutlinedButton(onClick = { if (model.saveNotionToken(token)) token = "" }, enabled = token.isNotBlank() && !model.syncing,
                modifier = Modifier.fillMaxWidth()) { Text("연결 키 저장") }
            Text("Notion의 ‘영어’ 페이지 연결 메뉴에서 이 integration에 두 교재와 ‘영어 학습 진도’ DB 접근 권한을 부여해주세요. 키는 이 기기에 암호화해 저장합니다.",
                style = MaterialTheme.typography.bodySmall)
            TextButton(onClick = { openUrl("https://www.notion.so/profile/integrations") }) { Text("Notion integration 설정 열기") }
            HorizontalDivider()
            Button(onClick = model::fetchNotionCourses, enabled = model.connectionConfigured && !model.syncing,
                modifier = Modifier.fillMaxWidth()) { Text("두 코스 자료 가져오기") }
            OutlinedButton(onClick = model::sendNotionProgress, enabled = model.connectionConfigured && !model.syncing,
                modifier = Modifier.fillMaxWidth()) { Text("학습 진도 Notion에 보내기") }
            if (model.syncing) {
                LinearProgressIndicator(modifier = Modifier.fillMaxWidth())
                Text("동기화 중에는 화면이 자동으로 꺼지지 않습니다. 앱을 열어두세요. 학습 화면으로 돌아가 계속 공부할 수 있습니다.", style = MaterialTheme.typography.bodySmall)
            }
            if (model.syncStatus.isNotBlank()) Text(model.syncStatus)
            Text("자료 갱신 · ${time(model.connection.dataSyncedAt)}\n진도 전송 · ${time(model.connection.progressSyncedAt)}", style = MaterialTheme.typography.bodySmall)
            TextButton(onClick = { openUrl("https://www.notion.so/${PROGRESS_DATABASE_ID.replace("-", "")}") }) { Text("영어 학습 진도 DB 열기") }
        }
    }, confirmButton = { TextButton(onClick = close) { Text("닫기") } })
}
