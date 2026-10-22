// 설치된 한국어와 영어 오프라인 음성으로 학습 문장을 읽는다.
package com.asher.englishstudy

import android.content.Context
import android.speech.tts.TextToSpeech
import android.speech.tts.Voice
import android.speech.tts.UtteranceProgressListener
import android.os.Handler
import android.os.Looper
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue

class NativeSpeech(context: Context, private val report: (String) -> Unit) {
    var ready by mutableStateOf(false)
        private set
    var voices by mutableStateOf<List<Voice>>(emptyList())
        private set
    private val handler = Handler(Looper.getMainLooper())
    private val engine = TextToSpeech(context.applicationContext) { status ->
        if (status == TextToSpeech.SUCCESS) refresh() else report("음성 엔진을 시작하지 못했습니다. 기기의 TTS 설정을 확인해주세요.")
    }

    init {
        engine.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
            override fun onStart(id: String?) = Unit
            override fun onDone(id: String?) = Unit
            @Deprecated("Android compatibility")
            override fun onError(id: String?) { handler.post { report("음성을 재생하지 못했습니다. 기기의 오프라인 음성 데이터를 확인해주세요.") } }
        })
    }

    fun refresh() {
        voices = engine.voices.orEmpty().filter { !it.isNetworkConnectionRequired && it.locale.language in setOf("ko", "en") }
            .sortedWith(compareByDescending<Voice> { it.quality }.thenBy { it.name })
        ready = true
    }
    fun forLanguage(language: String) = voices.filter { it.locale.language == language }

    fun speak(text: String, language: String, values: Map<String, String>, queued: Boolean = false) {
        if (!ready) { report("음성을 준비 중입니다. 잠시 후 다시 눌러주세요."); return }
        val available = forLanguage(language)
        val prefix = if (language == "ko") "ko" else "en"
        val saved = values["${prefix}VoiceURI"] ?: values["${prefix}VoiceName"]
        val voice = available.find { it.name == saved }
            ?: available.find { it.locale.toLanguageTag() == if (language == "en") "en-US" else "ko-KR" }
            ?: available.firstOrNull()
        if (voice == null) { report("${if (language == "ko") "한국어" else "영어"} 오프라인 음성 데이터가 없습니다. 음성 설정에서 설치해주세요."); return }
        if (!queued) engine.stop()
        engine.voice = voice
        engine.setSpeechRate(values["tts${if (language == "ko") "Ko" else "En"}Rate"]?.toFloat() ?: if (language == "ko") 1f else .9f)
        val result = engine.speak(text.take(TextToSpeech.getMaxSpeechInputLength()),
            if (queued) TextToSpeech.QUEUE_ADD else TextToSpeech.QUEUE_FLUSH, null, "study-${System.nanoTime()}")
        if (result == TextToSpeech.ERROR) report("음성 재생에 실패했습니다. TTS 설정을 확인해주세요.")
    }
    fun stop() { engine.stop() }
    fun close() { engine.stop(); engine.shutdown() }
}
