package com.waxmes.app.data

import android.content.Context
import androidx.compose.runtime.compositionLocalOf
import java.util.*

data class Lang(val code: String, val name: String, val flag: String, val translations: Map<String, String>)

fun getLanguages(): List<Lang> = listOf(
    Lang("tr", "Türkçe", "🇹🇷", mapOf(
        "waxmes" to "WaxMes",
        "search" to "Ara...", "search_friends" to "Arkadaş ara...",
        "search_by_username" to "Kullanıcı adı ile ara...",
        "search_info" to "Arkadaşlık isteği göndermek için kullanıcı adı ile arayın.",
        "no_pending" to "Bekleyen istek yok",
        "settings" to "Ayarlar", "logout" to "Çıkış Yap",
        "chats" to "Sohbetler", "new" to "Yeni",
        "no_messages" to "Henüz mesaj yok",
        "no_conversations" to "Henüz sohbet yok",
        "no_match" to "Eşleşen sohbet yok",
        "g" to "G", "online" to "Çevrimiçi", "offline" to "Çevrimdışı",
        "stories" to "Durumlar", "my_story" to "Durumum",
        "add_story" to "Durum Ekle", "friends" to "Arkadaşlar",
        "add_friend" to "Arkadaş Ekle",
        "your_story_here" to "Durumun burada görünecek",
        "close" to "Kapat", "conversation_actions" to "Sohbet İşlemleri",
        "unmute" to "Sesi Aç", "mute" to "Sessize Al",
        "receive_notif" to "Bildirimleri al", "silence_notif" to "Bildirimleri kapat",
        "unpin" to "Sabitlemeyi Kaldır", "pin" to "Sabitle",
        "remove_top" to "Üstten kaldır", "keep_top" to "Üstte tut",
        "unarchive" to "Arşivden Çıkar", "archive" to "Arşivle",
        "show_list" to "Listede göster", "hide_list" to "Listeden gizle",
        "clear_chat" to "Sohbeti Temizle",
        "delete_all" to "Tüm mesajları sil", "cancel" to "İptal",
        "profile" to "Profil", "themes" to "Temalar",
        "language" to "Dil", "debug" to "Hata Ayıklama",
        "about" to "Hakkında", "menu" to "Menü",
        "version" to "Sürüm", "loading" to "Yükleniyor...",
        "unknown" to "Bilinmiyor", "id_label" to "ID: ",
        "message_text" to "Mesaj...", "reply_text" to "Yanıtla...",
        "replying" to "Yanıtlıyorsun:", "editing" to "Düzenliyorsun:",
        "edit_text" to "Edit...", "image" to "📷 Görsel",
        "message_actions" to "Mesaj İşlemleri",
        "copy_text" to "Metni Kopyala", "reply" to "Yanıtla",
        "pin_message" to "Mesajı Sabitle", "forward" to "İlet",
        "forwarded" to "İletildi", "forward_comment" to "İletilen mesaja yorum ekle...",
        "groups" to "Gruplar", "send" to "Gönder",
        "edit" to "Düzenle", "delete" to "Sil",
        "pinned" to "Sabitlenmiş Mesajlar",
        "no_pinned" to "Sabitlenmiş mesaj yok.",
        "messages" to "mesaj",
        "media" to "Medya Galerisi",
        "no_media" to "Medya bulunamadı.",
        "today" to "Bugün", "yesterday" to "Dün",
        "no_results" to "Sonuç bulunamadı",
        "voice_call" to "Sesli Arama (Beta)",
        "deleted_msg" to "Bu mesaj silindi",
        "deleted_by_you" to "Bu mesajı sildiniz",
        "account_info" to "Hesap Bilgileri",
        "user_id" to "Kullanıcı ID", "display_name" to "Görünen Ad",
        "email" to "E-posta",
        "check_updates" to "Güncellemeleri Kontrol Et",
        "update_available" to "Güncelleme Mevcut",
        "checking" to "Kontrol ediliyor...",
        "ver_ready" to "Sürüm yüklenmeye hazır",
        "please_wait" to "Lütfen bekleyin...",
        "current_ver" to "Güncel: v0.1.0",
        "dark_themes" to "Koyu Temalar",
        "light_themes" to "Açık Temalar",
        "choose_category" to "Bir kategori seçip temaları önizleyin",
        "themes_available" to "tema mevcut",
        "select_theme" to "Tema Seç",
        "light" to "Açık", "dark" to "Koyu",
        "console" to "Konsol", "copy" to "Kopyala",
        "clear" to "Temizle", "no_logs" to "Henüz log yok",
        "copied" to "Panoya kopyalandı",
        "select_language" to "Dil Seçin",
        "available_languages" to "Kullanılabilir Diller",
        "current_language" to "Mevcut Dil",
        "use_device_lang" to "Cihaz Dilini Kullan",
        "confirm_delete_story_title" to "Durumu Kaldır",
        "confirm_delete_story_msg" to "Bu durum kalıcı olarak silinsin mi?",
        "confirm_delete" to "Kaldır",
        "name" to "Ad", "email_label" to "E-posta",
        "password" to "Şifre", "register" to "Kayıt Ol",
        "login" to "Giriş Yap",
        "reg_failed" to "Kayıt başarısız",
        "login_failed" to "Giriş başarısız",
        "have_account" to "Zaten hesabın var mı?",
        "create_account" to "Hesap oluştur",
        "platform" to "Platform",
        "framework" to "Framework",
        "architecture" to "Mimari",
        "android_native" to "Android Native",
        "jetpack_compose" to "Jetpack Compose",
        "mvvm_firebase" to "MVVM + Firebase",
        "copyright" to "\u00A9 2026 Waxur",
        "current_theme" to "Güncel temalar"
    )),
    Lang("en", "English", "🇬🇧", mapOf(
        "waxmes" to "WaxMes",
        "search" to "Search...", "search_friends" to "Search friends...",
        "search_by_username" to "Search by username...",
        "search_info" to "Search for users by their username to send a friend request.",
        "no_pending" to "No pending requests",
        "settings" to "Settings", "logout" to "Logout",
        "chats" to "Chats", "new" to "New",
        "no_messages" to "No messages yet",
        "no_conversations" to "No conversations yet",
        "no_match" to "No conversations match",
        "g" to "G", "online" to "Online", "offline" to "Offline",
        "stories" to "Stories", "my_story" to "My Story",
        "add_story" to "Add Story", "friends" to "Friends",
        "add_friend" to "Add Friend",
        "your_story_here" to "Your story will appear here",
        "close" to "Close", "conversation_actions" to "Conversation Actions",
        "unmute" to "Unmute", "mute" to "Mute",
        "receive_notif" to "Receive notifications",
        "silence_notif" to "Silence notifications",
        "unpin" to "Unpin", "pin" to "Pin",
        "remove_top" to "Remove from top", "keep_top" to "Keep at top",
        "unarchive" to "Unarchive", "archive" to "Archive",
        "show_list" to "Show in chat list", "hide_list" to "Hide from chat list",
        "clear_chat" to "Clear Chat",
        "delete_all" to "Delete all messages", "cancel" to "Cancel",
        "profile" to "Profile", "themes" to "Themes",
        "language" to "Language", "debug" to "Debug",
        "about" to "About", "menu" to "Menu",
        "version" to "Version", "loading" to "Loading...",
        "unknown" to "Unknown", "id_label" to "ID: ",
        "message_text" to "Message...", "reply_text" to "Reply...",
        "replying" to "Replying:", "editing" to "Editing:",
        "edit_text" to "Edit...", "image" to "📷 Image",
        "message_actions" to "Message Actions",
        "copy_text" to "Copy Text", "reply" to "Reply",
        "pin_message" to "Pin Message", "forward" to "Forward",
        "forwarded" to "Forwarded", "forward_comment" to "Add a comment to the forwarded message...",
        "groups" to "Groups", "send" to "Send",
        "edit" to "Edit", "delete" to "Delete",
        "pinned" to "Pinned Messages",
        "no_pinned" to "No pinned messages.",
        "messages" to "messages",
        "media" to "Media Gallery",
        "no_media" to "No media found.",
        "today" to "Today", "yesterday" to "Yesterday",
        "no_results" to "No results found",
        "voice_call" to "Voice Call (Beta)",
        "deleted_msg" to "This message was deleted",
        "deleted_by_you" to "You deleted this message",
        "account_info" to "Account Info",
        "user_id" to "User ID", "display_name" to "Display Name",
        "email" to "Email",
        "check_updates" to "Check for Updates",
        "update_available" to "Update Available",
        "checking" to "Checking...",
        "ver_ready" to "Version ready to install",
        "please_wait" to "Please wait...",
        "current_ver" to "Current: v0.1.0",
        "dark_themes" to "Dark Themes",
        "light_themes" to "Light Themes",
        "choose_category" to "Choose a category to preview and apply themes",
        "themes_available" to "themes available",
        "select_theme" to "Select Theme",
        "light" to "Light", "dark" to "Dark",
        "console" to "Console", "copy" to "Copy",
        "clear" to "Clear", "no_logs" to "No logs yet",
        "copied" to "Copied to clipboard",
        "select_language" to "Select Language",
        "available_languages" to "Available Languages",
        "current_language" to "Current Language",
        "use_device_lang" to "Use Device Language",
        "confirm_delete_story_title" to "Remove Story",
        "confirm_delete_story_msg" to "Delete this story permanently?",
        "confirm_delete" to "Delete",
        "name" to "Name", "email_label" to "Email",
        "password" to "Password", "register" to "Register",
        "login" to "Login",
        "reg_failed" to "Registration failed",
        "login_failed" to "Login failed",
        "have_account" to "Already have an account?",
        "create_account" to "Create account",
        "platform" to "Platform",
        "framework" to "Framework",
        "architecture" to "Architecture",
        "android_native" to "Android Native",
        "jetpack_compose" to "Jetpack Compose",
        "mvvm_firebase" to "MVVM + Firebase",
        "copyright" to "\u00A9 2026 Waxur",
        "current_theme" to "Current themes"
    ))
)

fun getLangByCode(code: String): Lang = getLanguages().find { it.code == code } ?: getLanguages()[0]
fun detectSystemLanguage(ctx: Context): String {
    val sysLang = Locale.getDefault().language
    return if (getLanguages().any { it.code == sysLang }) sysLang else "en"
}

/** Translates known system message strings from any language to the current language */
fun translateSystemMessage(msg: String, translations: Map<String, String>): String {
    if (msg.isEmpty()) return msg
    // Deleted message patterns (Turkish and English)
    val lower = msg.lowercase()
    if (lower.contains("bu mesajı sildiniz") || lower.contains("you deleted this message")) {
        return translations["deleted_by_you"] ?: "Bu mesajı sildiniz"
    }
    if (lower.contains("bu mesaj silindi") || lower.contains("this message was deleted")) {
        return translations["deleted_msg"] ?: "Bu mesaj silindi"
    }
    // Photo message
    if (msg.contains("📷 Photo") || msg.contains("📷 Fotoğraf") || msg == "📷 Photo" || msg.startsWith("📷")) {
        return "📷 " + (translations["image"]?.removePrefix("📷 ") ?: "Photo")
    }
    // Voice call logs: "📞 Sesli arama · START → END (DURATION)"
    if (lower.contains("sesli arama") || lower.contains("voice call")) {
        val callLabel = translations["voice_call"]?.removeSuffix(" (Beta)") ?: "Sesli Arama"
        // Replace "Sesli arama" or "Voice Call" with translated label
        val rest = msg
            .replace(Regex("(?i)Sesli arama"), callLabel)
            .replace(Regex("(?i)Voice Call"), callLabel)
        return rest
    }
    // Reply messages: "↩ text: text" - keep as-is, they contain user content
    return msg
}

val LocalLangCode = compositionLocalOf { "tr" }
val LocalTranslations = compositionLocalOf { emptyMap<String, String>() }