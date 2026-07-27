package com.waxmes.app.data

import com.google.firebase.Timestamp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.DocumentSnapshot
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.google.firebase.firestore.Source
import java.text.SimpleDateFormat
import java.util.*

fun docToConversation(doc: DocumentSnapshot, uid: String, nameCache: MutableMap<String, String>): Conversation? {
    val d = doc.data ?: return null
    val mids = d["memberIds"] as? List<String> ?: return null
    val otherId = mids.find { it != uid } ?: return null
    val name = d["name"] as? String
    val displayName = when {
        name != null && name.length < 30 -> name
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
    return Conversation(id = doc.id, name = displayName, lastMsg = (d["lastMsg"] as? String) ?: "",
        lastActivity = lastActivity, unread = 0, color = 0xFF818CF8, otherId = otherId)
}

fun docToMessage(doc: DocumentSnapshot, uid: String): Message {
    val d = doc.data ?: return Message(id = doc.id)
    return Message(id = doc.id, text = d["text"] as? String ?: "",
        time = d["time"] as? String ?: "", senderId = d["senderId"] as? String ?: "",
        type = if ((d["senderId"] as? String) == uid) "sent" else "received")
}

class Repository {
    val auth = FirebaseAuth.getInstance()
    val db = FirebaseFirestore.getInstance()
    val uid get() = auth.currentUser?.uid ?: ""
    val nameCache = mutableMapOf<String, String>()

    fun fetchUserName(userId: String, onResult: (String) -> Unit) {
        if (nameCache.containsKey(userId)) { onResult(nameCache[userId]!!); return }
        db.collection("users").document(userId).get(Source.SERVER).addOnSuccessListener { snap ->
            val name = snap.getString("displayName") ?: snap.getString("username") ?: userId.take(8)
            nameCache[userId] = name
            onResult(name)
        }
    }

    fun login(email: String, password: String, onResult: (Boolean) -> Unit) {
        auth.signInWithEmailAndPassword(email, password).addOnCompleteListener { onResult(it.isSuccessful) }
    }

    fun register(email: String, password: String, name: String, onResult: (Boolean) -> Unit) {
        auth.createUserWithEmailAndPassword(email, password).addOnCompleteListener { task ->
            if (!task.isSuccessful) { onResult(false); return@addOnCompleteListener }
            val u = auth.currentUser?.uid ?: return@addOnCompleteListener
            db.collection("users").document(u).set(mapOf("displayName" to name, "email" to email, "avatar" to name.first().uppercase(), "online" to true))
                .addOnCompleteListener { onResult(it.isSuccessful) }
        }
    }

    fun logout() = auth.signOut()

    fun dedup(convs: List<Conversation>): List<Conversation> {
        val seen = mutableMapOf<String, Conversation>()
        convs.forEach { c ->
            val existing = seen[c.otherId]
            if (existing == null || c.lastActivity > existing.lastActivity) seen[c.otherId] = c
        }
        return seen.values.sortedByDescending { it.lastActivity }
    }

    fun getConversations(onResult: (List<Conversation>) -> Unit) {
        if (uid.isEmpty()) { onResult(emptyList()); return }
        db.collection("conversations").whereArrayContains("memberIds", uid).get(Source.SERVER)
            .addOnSuccessListener { snap ->
                val convs = snap.documents.mapNotNull { docToConversation(it, uid, nameCache) }
                // Fetch missing display names
                var pending = 0
                convs.forEach { c ->
                    if (c.name.length == 11 && c.name.endsWith("...")) {
                        pending++
                        fetchUserName(c.otherId) { name ->
                            c.name = name
                            pending--
                            if (pending == 0) onResult(convs.sortedByDescending { it.lastActivity })
                        }
                    }
                }
                if (pending == 0) onResult(dedup(convs).sortedByDescending { it.lastActivity })
            }
    }

    fun listenConversations(onChange: (List<Conversation>) -> Unit) =
        db.collection("conversations").whereArrayContains("memberIds", uid).addSnapshotListener { snap, _ ->
            if (snap == null) return@addSnapshotListener
            onChange(dedup(snap.documents.mapNotNull { docToConversation(it, uid, nameCache) }))
        }

    fun listenMessages(convId: String, onChange: (List<Message>) -> Unit) =
        db.collection("conversations").document(convId).collection("messages")
            .orderBy("createdAt", Query.Direction.ASCENDING).addSnapshotListener { snap, _ ->
                if (snap == null) return@addSnapshotListener
                onChange(snap.documents.map { docToMessage(it, uid) })
            }

    fun sendMessage(convId: String, text: String) {
        val msg = mapOf("text" to text, "time" to SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date()),
            "senderId" to uid, "createdAt" to com.google.firebase.firestore.FieldValue.serverTimestamp())
        db.collection("conversations").document(convId).collection("messages").add(msg)
        db.collection("conversations").document(convId)
            .set(mapOf("lastMsg" to text, "lastActivity" to com.google.firebase.firestore.FieldValue.serverTimestamp()),
                com.google.firebase.firestore.SetOptions.merge())
    }
}