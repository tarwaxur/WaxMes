package com.waxmes.app.data

import android.content.Context
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.runtime.staticCompositionLocalOf

data class Lang(val code: String, val name: String, val flag: String, val translations: Map<String, String>)

fun getLanguages(): List<Lang> = listOf(
    Lang("tr", "Türkçe", "🇹🇷", mapOf(
        "chats" to "Sohbetler", "new" to "Yeni", "settings" to "Ayarlar",
        "profile" to "Profil", "themes" to "Temalar", "language" to "Dil",
        "debug" to "Hata Ayıklama", "about" to "Hakkında",
        "search_friends" to "Arkadaş ara...", "stories" to "Durumlar",
        "my_story" to "Durumum", "add_story" to "Durum Ekle",
        "add_friend" to "Arkadaş Ekle", "friends" to "Arkadaşlar",
        "no_messages" to "Henüz mesaj yok",
        "no_conversations" to "Henüz sohbet yok",
        "console" to "Konsol", "copy" to "Kopyala", "clear" to "Temizle",
        "no_logs" to "Henüz log yok", "copied" to "Panoya kopyalandı",
        "check_updates" to "Güncellemeleri Kontrol Et",
        "update_available" to "Güncelleme Mevcut",
        "current_version" to "Güncel: v0.1.0",
        "search" to "Ara...",
        "pinned" to "Sabitlenmiş Mesajlar",
        "media" to "Medya Galerisi", "voice_call" to "Sesli Arama (Beta)",
        "online" to "Çevrimiçi", "offline" to "Çevrimdışı",
        "deleted_msg" to "Bu mesaj silindi", "deleted_by_you" to "Bu mesajı sildiniz",
        "menu" to "Menü", "version" to "Sürüm",
        "pending" to "Bekleyenler", "add_friend_title" to "Arkadaş Ekle",
        "select_language" to "Dil Seçin", "cancel" to "İptal",
        "logout" to "Çıkış Yap", "account_info" to "Hesap Bilgileri",
        "message_text" to "Mesaj...", "reply_text" to "Yanıtla...",
        "friends_header" to "Arkadaşlar"
    )),
    Lang("en", "English", "🇬🇧", mapOf(
        "chats" to "Chats", "new" to "New", "settings" to "Settings",
        "profile" to "Profile", "themes" to "Themes", "language" to "Language",
        "debug" to "Debug", "about" to "About",
        "search_friends" to "Search friends...", "stories" to "Stories",
        "my_story" to "My Story", "add_story" to "Add Story",
        "add_friend" to "Add Friend", "friends" to "Friends",
        "no_messages" to "No messages yet",
        "no_conversations" to "No conversations yet",
        "console" to "Console", "copy" to "Copy", "clear" to "Clear",
        "no_logs" to "No logs yet", "copied" to "Copied to clipboard",
        "check_updates" to "Check for Updates",
        "update_available" to "Update Available",
        "current_version" to "Current: v0.1.0",
        "search" to "Search...",
        "pinned" to "Pinned Messages",
        "media" to "Media Gallery", "voice_call" to "Voice Call (Beta)",
        "online" to "Online", "offline" to "Offline",
        "deleted_msg" to "This message was deleted",
        "deleted_by_you" to "You deleted this message",
        "menu" to "Menu", "version" to "Version",
        "pending" to "Pending", "add_friend_title" to "Add Friend",
        "select_language" to "Select Language", "cancel" to "Cancel",
        "logout" to "Logout", "account_info" to "Account Info",
        "message_text" to "Message...", "reply_text" to "Reply...",
        "friends_header" to "Friends"
    ))
)

class TranslationManager(var currentLangCode: String = "tr") {
    private var currentLang = getLanguages().find { it.code == currentLangCode } ?: getLanguages()[0]

    fun setLanguage(code: String) { currentLangCode = code; currentLang = getLanguages().find { it.code == code } ?: getLanguages()[0] }
    fun get(key: String): String = currentLang.translations[key] ?: key
    fun getLang(): Lang = currentLang
    fun getCode(): String = currentLangCode
}

val LocalTranslationManager = staticCompositionLocalOf { TranslationManager() }