// 앱에 직접 입력한 Notion 키를 Android Keystore로 암호화해 보관한다.
package com.asher.englishstudy

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

class NotionConnection(context: Context) {
    private val prefs = context.getSharedPreferences("notion", 0)
    private val alias = "english-study-notion"
    val configured get() = prefs.contains("secret")
    val dataSyncedAt get() = prefs.getString("dataSyncedAt", "")!!
    val progressSyncedAt get() = prefs.getString("progressSyncedAt", "")!!
    private fun key(): SecretKey {
        val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (store.getKey(alias, null) as? SecretKey)?.let { return it }
        return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore").apply {
            init(KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build())
        }.generateKey()
    }
    fun saveToken(input: String) {
        val token = input.trim()
        require(token.length in 20..512 && token.none { it.isWhitespace() }) { "Notion 연결 키 형식을 확인해주세요." }
        val cipher = Cipher.getInstance("AES/GCM/NoPadding").apply { init(Cipher.ENCRYPT_MODE, key()) }
        check(prefs.edit().putString("secret", Base64.encodeToString(cipher.doFinal(token.toByteArray(Charsets.UTF_8)), Base64.NO_WRAP))
            .putString("iv", Base64.encodeToString(cipher.iv, Base64.NO_WRAP)).commit()) { "연결 키를 저장하지 못했습니다." }
    }
    fun token(): String {
        check(configured) { "먼저 앱에 Notion 연결 키를 입력해주세요." }
        return try {
            val cipher = Cipher.getInstance("AES/GCM/NoPadding").apply {
                init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, Base64.decode(prefs.getString("iv", ""), Base64.NO_WRAP)))
            }
            cipher.doFinal(Base64.decode(prefs.getString("secret", ""), Base64.NO_WRAP)).toString(Charsets.UTF_8)
        } catch (e: Exception) { error("저장된 연결 키를 열지 못했습니다. 앱 설정에서 다시 입력해주세요.") }
    }
    fun markSynced(kind: String, timestamp: String) {
        check(prefs.edit().putString(kind, timestamp).commit()) { "동기화는 완료했지만 완료 시각을 저장하지 못했습니다." }
    }
}
