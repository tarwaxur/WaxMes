package com.waxmes.app.data

data class User(val uid: String = "", val displayName: String = "", val avatar: String = "", val color: Long = 0xFF818CF8)
data class Conversation(val id: String = "", var name: String = "", val lastMsg: String = "", val lastActivity: Long = 0, var unread: Int = 0, val avatarUrl: String = "", val color: Long = 0xFF818CF8, val online: Boolean = false, val isGroup: Boolean = false, var otherId: String = "", var isPinned: Boolean = false, var isMuted: Boolean = false, var isArchived: Boolean = false)
data class Message(val id: String = "", val text: String = "", val time: String = "", val senderId: String = "", val type: String = "sent", val image: String = "", val audio: String = "", val video: String = "")
data class Story(val id: String = "", val authorId: String = "", val authorName: String = "", val text: String = "", val mediaUrl: String = "", val type: String = "text", val createdAt: Long = 0)