package com.waxmes.app.ui.screens

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.waxmes.app.data.Message
import com.waxmes.app.data.Repository
import com.waxmes.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatScreen(repo: Repository, convId: String, onBack: () -> Unit) {
    val t = LocalTheme.current
    var msgs by remember { mutableStateOf<List<Message>>(emptyList()) }
    var text by remember { mutableStateOf("") }
    var convName by remember { mutableStateOf("") }
    var showEmoji by remember { mutableStateOf(false) }
    val listState = rememberLazyListState()

    LaunchedEffect(convId) {
        repo.listenMessages(convId) { msgs = it }
        repo.getConversationName(convId) { convName = it }
    }
    LaunchedEffect(msgs.size) { if (msgs.isNotEmpty()) listState.animateScrollToItem(msgs.size - 1) }

    Scaffold(
        containerColor = t.bg,
        topBar = {
            TopAppBar(title = {
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.clickable { /* TODO: open profile sheet */ }) {
                    Box(modifier = Modifier.size(36.dp).clip(CircleShape).background(t.bg3), contentAlignment = Alignment.Center) {
                        Text(if (convName.isNotEmpty()) convName.first().uppercase() else "?", color = t.text2, fontWeight = FontWeight.Bold)
                    }
                    Spacer(Modifier.width(10.dp))
                    Column {
                        Text(convName.ifEmpty { "Loading..." }, color = t.text, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                        Text("Online", color = t.text4, fontSize = 10.sp)
                    }
                }
            }, navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, contentDescription = null, tint = t.text) } })
        },
        bottomBar = {
            Surface(color = InputBg) {
                Column {
                    // Emoji panel
                    AnimatedVisibility(visible = showEmoji) {
                        Surface(color = t.bg3, shadowElevation = 0.dp) {
                            Text("😊😂👍❤️🎉🔥✅🙏😍🤔", modifier = Modifier.padding(8.dp).clickable { /* insert emoji */ }, fontSize = 24.sp)
                        }
                    }
                    Row(modifier = Modifier.padding(8.dp).fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                        IconButton(onClick = { showEmoji = !showEmoji }) { Icon(Icons.Default.EmojiEmotions, contentDescription = null, tint = t.text3, modifier = Modifier.size(24.dp)) }
                        Spacer(Modifier.width(4.dp))
                        IconButton(onClick = { /* TODO: pick media */ }) { Icon(Icons.Default.AttachFile, contentDescription = null, tint = t.text3, modifier = Modifier.size(24.dp)) }
                        Spacer(Modifier.width(4.dp))
                        OutlinedTextField(value = text, onValueChange = { text = it }, placeholder = { Text("Message...", color = t.text4) },
                            modifier = Modifier.weight(1f), singleLine = true,
                            colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = t.accent, unfocusedBorderColor = t.border2, cursorColor = t.accent, focusedTextColor = t.text, unfocusedTextColor = t.text, focusedContainerColor = t.bg2, unfocusedContainerColor = t.bg2),
                            shape = RoundedCornerShape(10.dp))
                        Spacer(Modifier.width(8.dp))
                        IconButton(onClick = { if (text.isNotBlank()) { repo.sendMessage(convId, text); text = "" } }) { Icon(Icons.Default.Send, contentDescription = null, tint = t.accent) }
                    }
                }
            }
        }
    ) { padding ->
        LazyColumn(modifier = Modifier.fillMaxSize().padding(padding).background(t.bg).navigationBarsPadding(), state = listState, contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp)) {
            items(msgs) { msg ->
                val isMine = msg.type == "sent"
                Column(modifier = Modifier.fillMaxWidth().padding(vertical = 2.dp), horizontalAlignment = if (isMine) Alignment.End else Alignment.Start) {
                    Surface(shape = RoundedCornerShape(12.dp, if (isMine) 12.dp else 4.dp, if (isMine) 4.dp else 12.dp, 12.dp),
                        color = if (isMine) t.accent.copy(alpha = 0.15f) else t.msgReceived) {
                        Text(msg.text, modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp), color = t.text, fontSize = 14.sp, maxLines = 10)
                    }
                }
            }
        }
    }
}