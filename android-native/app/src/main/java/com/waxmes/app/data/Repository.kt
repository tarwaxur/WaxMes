package com.waxmes.app.data

import com.google.firebase.Timestamp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.google.firebase.firestore.Source
import kotlinx.coroutines.tasks.await
import java.text.SimpleDateFormat
import java.util.*

class Repository {
    val auth = FirebaseAuth.getInstance()
    val db = FirebaseFirestore.getInstance()
    val uid get() = auth.currentUser?.uid ?: ""

    suspend fun login(email: String, password: String): Boolean = try { auth.signInWithEmailAndPassword(email, password).await(); true } catch (e: Exception) { false }
    suspend fun register(email: String, password: String, name: String): Boolean = try {
        auth.createUserWithEmailAndPassword(email, password).await()
        uid.let { db.collection("users").document(it).set(mapOf("displayName" to name, "email" to email, "avatar" to name.first().uppercase(), "online" to true)).await() }; true
    } catch (e: Exception) { false }

    fun logout() = auth.signOut()

    fun getConversations(onResult: (List<Conversation>) -> Unit) {
        if (uid.isEmpty()) { onResult(emptyList()); return }
        db.collection("conversations").whereArrayContains("memberIds", uid).get(Source.SERVER).addOnSuccessListener { snap ->
            onResult(snap.documents.mapNotNull { doc ->
                val d = doc.data ?: return@mapNotNull null
                val mids = d["memberIds"] as? List<String> ?: return@mapNotNull null
                val otherId = mids.find { it != uid } ?: return@mapNotNull null
                Conversation(id = doc.id, name = d["name"] as? String ?: otherId,
                    lastMsg = (d["lastMsg"] as? String) ?: "",
                    lastActivity = ((d["lastActivity"] as? Timestamp)?.toMillis() ?: (d["lastActivity"] as? Long ?: 0L)),
                    unread = 0, color = 0xFF818CF8)
            }.sortedByDescending { it.lastActivity })
        }
    }

    fun listenConversations(onChange: (List<Conversation>) -> Unit) = db.collection("conversations").whereArrayContains("memberIds", uid).addSnapshotListener { snap, _ ->
        if (snap == null) return@addSnapshotListener
        onChange(snap.documents.mapNotNull { doc ->
            val d = doc.data ?: return@mapNotNull null
            val mids = d["memberIds"] as? List<String> ?: return@mapNotNull null
            val otherId = mids.find { it != uid } ?: return@mapNotNull null
            Conversation(id = doc.id, name = d["name"] as? String ?: otherId,
                lastMsg = (d["lastMsg"] as? String) ?: "",
                lastActivity = ((d["lastActivity"] as? Timestamp)?.toMillis() ?: (d["lastActivity"] as? Long ?: 0L)),
                unread = 0, color = 0xFF818CF8)
        }.sortedByDescending { it.lastActivity })
    }

    fun listenMessages(convId: String, onChange: (List<Message>) -> Unit) = db.collection("conversations").document(convId).collection("messages")
        .orderBy("createdAt", Query.Direction.ASCENDING).addSnapshotListener { snap, _ ->
            if (snap == null) return@addSnapshotListener
            onChange(snap.documents.map { doc ->
                val d = doc.data ?: return@map doc
                Message(id = doc.id, text = d["text"] as? String ?: "",
                    time = d["time"] as? String ?: "", senderId = d["senderId"] as? String ?: "",
                    type = if ((d["senderId"] as? String) == uid) "sent" else "received")
            })
        }

    fun sendMessage(convId: String, text: String) {
        val msg = mapOf("text" to text, "time" to SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date()),
            "senderId" to uid, "createdAt" to com.google.firebase.firestore.FieldValue.serverTimestamp())
        db.collection("conversations").document(convId).collection("messages").add(msg)
        db.collection("conversations").document(convId).set(mapOf("lastMsg" to text, "lastActivity" to com.google.firebase.firestore.FieldValue.serverTimestamp()), com.google.firebase.firestore.SetOptions.merge())
    }
}