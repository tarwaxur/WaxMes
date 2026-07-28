package com.waxmes.app.data

import android.content.ContentResolver
import android.net.Uri
import com.google.firebase.Timestamp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.DocumentSnapshot
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.google.firebase.firestore.Source
import com.waxmes.app.data.appLog
import java.text.SimpleDateFormat
import java.util.*

fun docToConversation(doc: DocumentSnapshot, uid: String, nameCache: MutableMap<String, String>, avatarCache: MutableMap<String, String> = mutableMapOf(), onlineCache: MutableMap<String, Boolean> = mutableMapOf()): Conversation? {
    val d = doc.data ?: return null
    val mids = d["memberIds"] as? List<String> ?: return null
    val isGroup = d["isGroup"] as? Boolean ?: (mids.size > 2)
    val name = d["name"] as? String
    val otherId = if (isGroup) mids.firstOrNull { it != uid } ?: mids.firstOrNull() ?: "" else mids.find { it != uid } ?: return null
    val displayName = when {
        !name.isNullOrEmpty() -> name
        nameCache[otherId] != null -> nameCache[otherId]!!
        else -> otherId.take(8) + "..."
    }
    val la = d["lastActivity"]
    val lastActivity = when (la) {
        is Timestamp -> la.toDate().time
        is Long -> la
        is Number -> la.toLong()
        else -> 0L
    }
    val cachedAvatar = if (isGroup) "" else (avatarCache[otherId] ?: "")
    val cachedOnline = if (isGroup) false else (onlineCache[otherId] ?: false)
    return Conversation(id = doc.id, name = displayName, lastMsg = (d["lastMsg"] as? String) ?: "",
        lastActivity = lastActivity, unread = 0, avatarUrl = cachedAvatar, color = if (isGroup) 0xFF818CF8 else 0xFF818CF8,
        online = cachedOnline, otherId = otherId, isGroup = isGroup)
}

fun docToMessage(doc: DocumentSnapshot, uid: String): Message {
    val d = doc.data ?: return Message(id = doc.id)
    return Message(id = doc.id, text = d["text"] as? String ?: "",
        time = d["time"] as? String ?: "", senderId = d["senderId"] as? String ?: "",
        type = if ((d["senderId"] as? String) == uid) "sent" else "received",
        image = d["image"] as? String ?: "")
}

class Repository {
    val auth = FirebaseAuth.getInstance()
    val db = FirebaseFirestore.getInstance()
    val uid get() = auth.currentUser?.uid ?: ""
    val nameCache = mutableMapOf<String, String>()
    val userCache = mutableMapOf<String, String>()
    val onlineCache = mutableMapOf<String, Boolean>()

    fun fetchUserName(userId: String, onResult: (String) -> Unit) {
        if (nameCache.containsKey(userId)) { onResult(nameCache[userId]!!); return }
        db.collection("users").document(userId).get(Source.SERVER).addOnSuccessListener { snap ->
            val name = snap.getString("displayName") ?: snap.getString("username") ?: userId.take(8)
            nameCache[userId] = name
            val avatar = snap.getString("avatarUrl") ?: snap.getString("avatar") ?: ""
            userCache[userId] = avatar
            onlineCache[userId] = snap.getBoolean("online") ?: false
            onResult(name)
        }
    }

    fun fetchUserStatus(userId: String, onResult: (String, Boolean, String) -> Unit) {
        val cachedName = nameCache[userId]
        val cachedAvatar = userCache[userId]
        val cachedOnline = onlineCache[userId]
        if (cachedName != null && cachedAvatar != null && cachedOnline != null) {
            onResult(cachedName, cachedOnline, cachedAvatar); return
        }
        db.collection("users").document(userId).get(Source.SERVER).addOnSuccessListener { snap ->
            val name = snap.getString("displayName") ?: snap.getString("username") ?: userId.take(8)
            val avatar = snap.getString("avatarUrl") ?: snap.getString("avatar") ?: ""
            val online = snap.getBoolean("online") ?: false
            nameCache[userId] = name; userCache[userId] = avatar; onlineCache[userId] = online
            onResult(name, online, avatar)
        }
    }

    fun login(email: String, password: String, onResult: (Boolean) -> Unit) {
        appLog("Login attempt: $email")
        auth.signInWithEmailAndPassword(email, password).addOnCompleteListener { appLog("Login result: ${if (it.isSuccessful) "OK" else "FAIL"}"); onResult(it.isSuccessful) }
    }

    fun register(email: String, password: String, name: String, onResult: (Boolean) -> Unit) {
        appLog("Register: $name / $email")
        auth.createUserWithEmailAndPassword(email, password).addOnCompleteListener { task ->
            if (!task.isSuccessful) { appLog("Register fail: ${task.exception?.message}"); onResult(false); return@addOnCompleteListener }
            val u = auth.currentUser?.uid ?: return@addOnCompleteListener
            db.collection("users").document(u).set(mapOf("displayName" to name, "email" to email, "avatar" to name.first().uppercase(), "online" to true))
                .addOnCompleteListener { onResult(it.isSuccessful) }
        }
    }

    fun logout() = auth.signOut()

    fun dedup(convs: List<Conversation>): List<Conversation> {
        val seen = mutableMapOf<String, Conversation>()
        convs.forEach { c ->
            val key = if (c.isGroup) c.id else c.otherId
            val existing = seen[key]
            if (existing == null || c.lastActivity > existing.lastActivity) seen[key] = c
        }
        return seen.values.sortedByDescending { it.lastActivity }
    }

    private fun enrichConversation(c: Conversation) {
        if (c.isGroup) return
        if (userCache[c.otherId] != null || nameCache[c.otherId] == null) {
            fetchUserName(c.otherId) { name ->
                c.name = name; c.avatarUrl = userCache[c.otherId] ?: ""; c.online = onlineCache[c.otherId] ?: false
            }
        } else {
            c.avatarUrl = userCache[c.otherId] ?: ""; c.online = onlineCache[c.otherId] ?: false
        }
    }

    fun getConversations(onResult: (List<Conversation>) -> Unit) {
        if (uid.isEmpty()) { onResult(emptyList()); return }
        appLog("Fetching conversations...")
        db.collection("conversations").whereArrayContains("memberIds", uid).get(Source.SERVER)
            .addOnSuccessListener { snap ->
                val convs = snap.documents.mapNotNull { docToConversation(it, uid, nameCache, userCache, onlineCache) }
                appLog("Got ${convs.size} conversations")
                var pending = 0
                convs.forEach { c ->
                    if (c.name.length == 11 && c.name.endsWith("...") || (!c.isGroup && userCache[c.otherId] == null)) {
                        pending++
                        fetchUserName(c.otherId) { name ->
                            if (!c.isGroup) c.name = name
                            c.avatarUrl = userCache[c.otherId] ?: ""; c.online = onlineCache[c.otherId] ?: false
                            pending--
                            if (pending == 0) onResult(dedup(convs).sortedByDescending { it.lastActivity })
                        }
                    }
                }
                if (pending == 0) onResult(dedup(convs).sortedByDescending { it.lastActivity })
            }
    }

    fun listenConversations(onChange: (List<Conversation>) -> Unit) {
        db.collection("conversations").whereArrayContains("memberIds", uid).addSnapshotListener { snap, _ ->
            if (snap == null) return@addSnapshotListener
            val convs = snap.documents.mapNotNull { docToConversation(it, uid, nameCache, userCache, onlineCache) }
            var pending = 0
            convs.forEach { c ->
                if (!c.isGroup && userCache[c.otherId] == null) {
                    pending++
                    fetchUserName(c.otherId) { name ->
                        c.name = name; c.avatarUrl = userCache[c.otherId] ?: ""; c.online = onlineCache[c.otherId] ?: false
                        pending--
                        if (pending == 0) onChange(dedup(convs))
                    }
                }
            }
            if (pending == 0) onChange(dedup(convs))
        }
    }

    fun listenMessages(convId: String, onChange: (List<Message>) -> Unit) =
        db.collection("conversations").document(convId).collection("messages")
            .orderBy("createdAt", Query.Direction.ASCENDING).addSnapshotListener { snap, _ ->
                if (snap == null) return@addSnapshotListener
                onChange(snap.documents.map { docToMessage(it, uid) })
            }

    fun getConversationName(convId: String, onResult: (String) -> Unit = {}) {
        db.collection("conversations").document(convId).get().addOnSuccessListener { snap ->
            val name = snap.getString("name")
            if (!name.isNullOrEmpty()) { onResult(name); return@addOnSuccessListener }
            val mids = snap.get("memberIds") as? List<String> ?: return@addOnSuccessListener
            val otherId = mids.find { it != uid } ?: return@addOnSuccessListener
            fetchUserName(otherId) { onResult(it) }
        }
    }

    fun getConversationStatus(convId: String, onResult: (String, Boolean, String) -> Unit) {
        db.collection("conversations").document(convId).get().addOnSuccessListener { snap ->
            val isGroup = snap.getBoolean("isGroup") ?: false
            if (isGroup) { onResult(snap.getString("name") ?: "Group", false, ""); return@addOnSuccessListener }
            val mids = snap.get("memberIds") as? List<String> ?: return@addOnSuccessListener
            val otherId = mids.find { it != uid } ?: return@addOnSuccessListener
            fetchUserStatus(otherId, onResult)
        }
    }

    fun sendMessage(convId: String, text: String, isMedia: Boolean = false) {
        appLog("Sending ${if (isMedia) "media" else "text"} message to $convId")
        val msg = mutableMapOf<String, Any>("time" to SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date()),
            "senderId" to uid, "createdAt" to com.google.firebase.firestore.FieldValue.serverTimestamp())
        if (isMedia) { msg["image"] = text; msg["text"] = "" }
        else msg["text"] = text
        db.collection("conversations").document(convId).collection("messages").add(msg)
        db.collection("conversations").document(convId)
            .set(mapOf("lastMsg" to if (isMedia) "📷 Photo" else text, "lastActivity" to com.google.firebase.firestore.FieldValue.serverTimestamp()),
                com.google.firebase.firestore.SetOptions.merge())
    }

    private var contentResolver: ContentResolver? = null
    fun setContentResolver(cr: ContentResolver) { contentResolver = cr }

    fun uploadImage(uri: Uri, onResult: (String?) -> Unit) {
        val cr = contentResolver ?: run { onResult(null); return }
        try {
            val inputStream = cr.openInputStream(uri) ?: run { onResult(null); return }
            val bytes = inputStream.readBytes()
            inputStream.close()
            val mimeType = cr.getType(uri) ?: "image/jpeg"
            val base64 = android.util.Base64.encodeToString(bytes, android.util.Base64.NO_WRAP)
            val dataUrl = "data:$mimeType;base64,$base64"
            val sizeKB = dataUrl.length / 1024
            if (dataUrl.length > 1048000) {
                appLog("Image too large: ${dataUrl.length} bytes (${sizeKB}KB). Max 1MB")
                onResult(null); return
            }
            appLog("Image encoded: ${dataUrl.length} bytes (${sizeKB}KB)")
            onResult(dataUrl)
        } catch (e: Exception) {
            appLog("Image read error: ${e.message}")
            onResult(null)
        }
    }

    fun clearMessages(convId: String) {
        appLog("Clearing messages for $convId")
        db.collection("conversations").document(convId).collection("messages").get().addOnSuccessListener { snap ->
            val batch = db.batch()
            snap.documents.forEach { batch.delete(it.reference) }
            batch.commit()
            appLog("Cleared ${snap.documents.size} messages")
        }
        db.collection("conversations").document(convId).set(mapOf("lastMsg" to ""), com.google.firebase.firestore.SetOptions.merge())
    }
}