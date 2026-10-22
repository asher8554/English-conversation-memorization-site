// 학습 앱을 시작하고 Android 파일 선택기로 브라우저 기록을 가져온다.
package com.asher.englishstudy

import android.os.Bundle
import android.content.Intent
import android.net.Uri
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.lifecycle.ViewModelProvider
import androidx.core.view.WindowCompat
import android.view.Window
import android.view.WindowManager
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect

class MainActivity : ComponentActivity() {
    private lateinit var model: StudyModel
    private val importFile = registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri != null) runCatching {
            val bytes = contentResolver.openInputStream(uri)?.use { it.readNBytes(1048577) }
                ?: error("파일을 열 수 없습니다.")
            require(bytes.size <= 1048576) { "백업 파일은 1MB 이하여야 합니다." }
            model.prepareImport(bytes.toString(Charsets.UTF_8))
        }.onFailure { model.notice = "가져오지 않았습니다. ${it.message}" }
    }
    private val exportFile = registerForActivityResult(ActivityResultContracts.CreateDocument("application/json")) { uri ->
        if (uri != null) runCatching {
            contentResolver.openOutputStream(uri)?.bufferedWriter()?.use { it.write(writeBackup(model.values)) }
                ?: error("파일을 쓸 수 없습니다.")
            model.notice = "기록 백업을 저장했습니다."
        }.onFailure { model.notice = "백업 저장에 실패했습니다. 원본 기록은 유지됩니다." }
    }
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        WindowCompat.getInsetsController(window, window.decorView).apply {
            isAppearanceLightStatusBars = false
            isAppearanceLightNavigationBars = false
        }
        model = ViewModelProvider(this)[StudyModel::class.java]
        setContent {
            KeepScreenOnWhileSyncing(window, model.syncing)
            StudyTheme(model.dark) {
                StudyScreen(model, onImport = { importFile.launch(arrayOf("application/json", "text/plain", "application/octet-stream")) },
                    onExport = { exportFile.launch("english-study-backup.json") },
                    onOpenUrl = { url ->
                        runCatching { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) }
                            .onFailure { model.notice = "링크를 열 앱이 없습니다." }
                    }, onTtsSettings = {
                        runCatching { startActivity(Intent("com.android.settings.TTS_SETTINGS")) }
                            .onFailure { model.notice = "기기 설정에서 텍스트 음성 변환과 오프라인 음성 데이터를 확인해주세요." }
                    })
            }
        }
    }
    override fun onStop() { if (::model.isInitialized) model.speech.stop(); super.onStop() }
    override fun onResume() { super.onResume(); if (::model.isInitialized && model.speech.ready) model.speech.refresh() }
}

@Composable
internal fun KeepScreenOnWhileSyncing(window: Window?, syncing: Boolean) {
    DisposableEffect(window, syncing) {
        if (syncing) window?.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        else window?.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        onDispose { window?.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON) }
    }
}
