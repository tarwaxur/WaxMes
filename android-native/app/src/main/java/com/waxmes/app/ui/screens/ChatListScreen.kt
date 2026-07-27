package com.waxmes.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Chat
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.waxmes.app.data.Conversation
import com.waxmes.app.data.Repository
import com.waxmes.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatListScreen(repo: Repository, onChatClick: (String) -> Unit) {
    var convs by remember { mutableStateOf<List<Conversation>>(emptyList()) }

    LaunchedEffect(Unit) {
        convs = repo.getConversations()
        repo.listenConversations { convs = it }
    }

    Scaffold(
        containerColor = Bg,
        topBar = { TopAppBar(title = { Text("WaxMes", fontWeight = FontWeight.Bold, color = Text) }),
            colors = TopAppBarDefaults.topAppBarColors(containerColor = Surface, titleContentColor = Text) },
        bottomBar = { NavigationBar(containerColor = Surface) {
            NavigationBarItem(selected = true, onClick = {}, icon = { Icon(Icons.Default.Chat, contentDescription = null) }, label = { Text("Sohbetler", fontSize = 11.sp) }, colors = NavigationBarItemDefaults.colors(selectedIconColor = Accent, selectedTextColor = Accent, indicatorColor = Surface))
            NavigationBarItem(selected = false, onClick = {}, icon = { Icon(Icons.Default.Add, contentDescription = null) }, label = { Text("Durum", fontSize = 11.sp) }, colors = NavigationBarItemDefaults.colors(selectedIconColor = Accent, selectedTextColor = Accent, indicatorColor = Surface))
            NavigationBarItem(selected = false, onClick = {}, icon = { Icon(Icons.Default.Settings, contentDescription = null) }, label = { Text("Ayarlar", fontSize = 11.sp) }, colors = NavigationBarItemDefaults.colors(selectedIconColor = Accent, selectedTextColor = Accent, indicatorColor = Surface))
        } }
    ) { padding ->
        LazyColumn(modifier = Modifier.fillMaxSize().padding(padding).background(Bg), contentPadding = PaddingValues(vertical = 4.dp)) {
            items(convs) { conv ->
                Row(modifier = Modifier.fillMaxWidth().clickable { onChatClick(conv.id) }.padding(horizontal = 12.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                    Box(modifier = Modifier.size(48.dp).clip(CircleShape).background(conv.color.color()), contentAlignment = Alignment.Center) {
                        Text(conv.name.first().uppercase(), color = Text, fontWeight = FontWeight.Bold)
                    }
                    Spacer(Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(conv.name, color = Text, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        if (conv.lastMsg.isNotEmpty()) Text(conv.lastMsg, color = Text3, fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                    if (conv.unread > 0) Box(modifier = Modifier.size(20.dp).clip(CircleShape).background(Red), contentAlignment = Alignment.Center) { Text("$conv.unread", color = Text, fontSize = 10.sp, fontWeight = FontWeight.Bold) }
                }
            }
        }
    }
}

private fun Long.color() = androidx.compose.ui.graphics.Color(this)