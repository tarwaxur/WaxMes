package com.waxmes.app.ui.screens

import android.content.Context
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.DpOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.waxmes.app.data.Conversation
import com.waxmes.app.data.Repository
import com.waxmes.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class, ExperimentalFoundationApi::class)
@Composable
fun ChatListScreen(repo: Repository, onChatClick: (String) -> Unit, onSettingsClick: () -> Unit) {
    val t = LocalTheme.current
    val ctx = LocalContext.current
    val prefs = ctx.getSharedPreferences("waxmes", Context.MODE_PRIVATE)
    var convs by remember { mutableStateOf<List<Conversation>>(emptyList()) }
    var showMenu by remember { mutableStateOf(false) }
    var searchQuery by remember { mutableStateOf("") }
    var isSearching by remember { mutableStateOf(false) }
    var contextConvId by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        repo.getConversations { list ->
            convs = list.map { c ->
                c.copy(isPinned = prefs.getBoolean("pin_${c.id}", false),
                    isMuted = prefs.getBoolean("mute_${c.id}", false),
                    isArchived = prefs.getBoolean("arch_${c.id}", false))
            }
        }
        repo.listenConversations { list ->
            convs = list.map { c ->
                c.copy(isPinned = prefs.getBoolean("pin_${c.id}", false),
                    isMuted = prefs.getBoolean("mute_${c.id}", false),
                    isArchived = prefs.getBoolean("arch_${c.id}", false))
            }
        }
    }

    val displayConvs = if (searchQuery.isBlank()) {
        convs.filter { !it.isArchived }
    } else {
        convs.filter { !it.isArchived && (it.name.contains(searchQuery, ignoreCase = true) || it.lastMsg.contains(searchQuery, ignoreCase = true)) }
    }

    Scaffold(
        containerColor = t.bg,
        topBar = {
            TopAppBar(title = {
                if (isSearching) {
                    OutlinedTextField(value = searchQuery, onValueChange = { searchQuery = it }, placeholder = { Text("Search...", color = t.text4) }, singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = t.accent, unfocusedBorderColor = t.border, cursorColor = t.accent, focusedTextColor = t.text, unfocusedTextColor = t.text, focusedContainerColor = t.bg2, unfocusedContainerColor = t.bg2),
                        modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(10.dp))
                } else {
                    Text("WaxMes", fontWeight = FontWeight.Bold, color = t.text)
                }
            }, actions = {
                if (isSearching) {
                    IconButton(onClick = { isSearching = false; searchQuery = "" }) { Icon(Icons.Default.Close, contentDescription = null, tint = t.text3) }
                } else {
                    IconButton(onClick = { isSearching = true }) { Icon(Icons.Default.Search, contentDescription = null, tint = t.text3) }
                    Box {
                        IconButton(onClick = { showMenu = true }) { Icon(Icons.Default.MoreVert, contentDescription = null, tint = t.text3) }
                        DropdownMenu(expanded = showMenu, onDismissRequest = { showMenu = false }, offset = DpOffset(0.dp, 4.dp), containerColor = t.bg2) {
                            DropdownMenuItem(text = { Text("Settings", color = t.text) }, onClick = { showMenu = false; onSettingsClick() }, leadingIcon = { Icon(Icons.Default.Settings, contentDescription = null, tint = t.text3) })
                            DropdownMenuItem(text = { Text("Logout", color = Color(0xFFef4444)) }, onClick = {
                                showMenu = false; repo.logout(); prefs.edit().clear().apply()
                                (ctx as? android.app.Activity)?.recreate()
                            }, leadingIcon = { Icon(Icons.Default.Logout, contentDescription = null, tint = Color(0xFFef4444)) })
                        }
                    }
                }
            })
        }
    ) { padding ->
        LazyColumn(modifier = Modifier.fillMaxSize().padding(padding).background(t.bg).navigationBarsPadding(), contentPadding = PaddingValues(vertical = 4.dp)) {
            items(displayConvs) { conv ->
                Row(modifier = Modifier.fillMaxWidth().combinedClickable(
                    onClick = { onChatClick(conv.id) },
                    onLongClick = { contextConvId = conv.id }
                ).padding(horizontal = 12.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                    Box(modifier = Modifier.size(48.dp).clip(CircleShape).background(Color(conv.color)), contentAlignment = Alignment.Center) {
                        Text(conv.name.first().uppercase(), color = t.text, fontWeight = FontWeight.Bold)
                    }
                    Spacer(Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            if (conv.isPinned) Icon(Icons.Default.PushPin, contentDescription = null, tint = t.text4, modifier = Modifier.size(14.dp))
                            if (conv.isMuted) Icon(Icons.Default.VolumeOff, contentDescription = null, tint = t.text4, modifier = Modifier.size(14.dp))
                            Spacer(Modifier.width(4.dp))
                            Text(conv.name, color = t.text, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        }
                        if (conv.lastMsg.isNotEmpty()) Text(conv.lastMsg, color = t.text3, fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                    if (conv.unread > 0) Box(modifier = Modifier.size(20.dp).clip(CircleShape).background(Color(0xFFef4444)), contentAlignment = Alignment.Center) {
                        Text("${conv.unread}", color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
            if (displayConvs.isEmpty() && convs.isNotEmpty()) {
                item { Text("No conversations match", color = t.text4, modifier = Modifier.padding(20.dp).fillMaxWidth(), fontSize = 13.sp) }
            }
            if (convs.isEmpty()) {
                item { Text("No conversations yet", color = t.text4, modifier = Modifier.padding(40.dp).fillMaxWidth(), fontSize = 13.sp) }
            }
        }
    }

    // Context menu dialog
    if (contextConvId != null) {
        val conv = convs.find { it.id == contextConvId }
        if (conv != null) {
            AlertDialog(onDismissRequest = { contextConvId = null },
                title = { Text(conv.name, fontWeight = FontWeight.Bold, color = t.text) },
                text = {
                    Column {
                        TextButton(onClick = {
                            val muted = !conv.isMuted; prefs.edit().putBoolean("mute_${conv.id}", muted).apply()
                            convs = convs.toMutableList().also { it.find { it.id == conv.id }?.isMuted = muted }; contextConvId = null
                        }, modifier = Modifier.fillMaxWidth()) { Text(if (conv.isMuted) "Unmute" else "Mute", color = t.text) }
                        TextButton(onClick = {
                            val pinned = !conv.isPinned; prefs.edit().putBoolean("pin_${conv.id}", pinned).apply()
                            convs = convs.toMutableList().also { it.find { it.id == conv.id }?.isPinned = pinned }; contextConvId = null
                        }, modifier = Modifier.fillMaxWidth()) { Text(if (conv.isPinned) "Unpin" else "Pin", color = t.text) }
                        TextButton(onClick = {
                            val archived = !conv.isArchived; prefs.edit().putBoolean("arch_${conv.id}", archived).apply()
                            convs = convs.toMutableList().also { it.find { it.id == conv.id }?.isArchived = archived }; contextConvId = null
                        }, modifier = Modifier.fillMaxWidth()) { Text(if (conv.isArchived) "Unarchive" else "Archive", color = t.text) }
                        TextButton(onClick = {
                            repo.clearMessages(conv.id)
                            convs = convs.toMutableList().also { it.removeAll { c -> c.id == conv.id } }; contextConvId = null
                        }, modifier = Modifier.fillMaxWidth()) { Text("Clear Chat", color = Color(0xFFef4444)) }
                    }
                },
                confirmButton = { TextButton(onClick = { contextConvId = null }) { Text("Cancel", color = t.accent) } })
        }
    }
}