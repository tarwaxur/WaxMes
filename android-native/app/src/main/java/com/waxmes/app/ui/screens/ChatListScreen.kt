package com.waxmes.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Chat
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.waxmes.app.data.Conversation
import com.waxmes.app.data.Repository
import com.waxmes.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatListScreen(repo: Repository, onChatClick: (String) -> Unit, onSettingsClick: () -> Unit) {
    val t = LocalTheme.current
    var convs by remember { mutableStateOf<List<Conversation>>(emptyList()) }

    LaunchedEffect(Unit) {
        repo.getConversations { convs = it }
        repo.listenConversations { convs = it }
    }

    Scaffold(
        containerColor = t.bg,
        topBar = { TopAppBar(title = { Text("WaxMes", fontWeight = FontWeight.Bold, color = t.text) }) },
        bottomBar = { NavigationBar(containerColor = t.bg2) {
            NavigationBarItem(selected = true, onClick = {}, icon = { Icon(Icons.Default.Chat, contentDescription = null, tint = t.accent) }, label = { Text("Sohbetler", fontSize = 11.sp, color = t.accent) })
            NavigationBarItem(selected = false, onClick = {}, icon = { Icon(Icons.Default.Add, contentDescription = null, tint = t.text3) }, label = { Text("Durum", fontSize = 11.sp, color = t.text3) })
            NavigationBarItem(selected = false, onClick = onSettingsClick, icon = { Icon(Icons.Default.Settings, contentDescription = null, tint = t.text3) }, label = { Text("Settings", fontSize = 11.sp, color = t.text3) })
        } }
    ) { padding ->
        LazyColumn(modifier = Modifier.fillMaxSize().padding(padding).background(t.bg), contentPadding = PaddingValues(vertical = 4.dp)) {
            items(convs) { conv ->
                Row(modifier = Modifier.fillMaxWidth().clickable { onChatClick(conv.id) }.padding(horizontal = 12.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                    Box(modifier = Modifier.size(48.dp).clip(CircleShape).background(Color(conv.color)), contentAlignment = Alignment.Center) {
                        Text(conv.name.first().uppercase(), color = t.text, fontWeight = FontWeight.Bold)
                    }
                    Spacer(Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(conv.name, color = t.text, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        if (conv.lastMsg.isNotEmpty()) Text(conv.lastMsg, color = t.text3, fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                    if (conv.unread > 0) Box(modifier = Modifier.size(20.dp).clip(CircleShape).background(Color(0xFFef4444)), contentAlignment = Alignment.Center) { Text("${conv.unread}", color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.Bold) }
                }
            }
        }
    }
}