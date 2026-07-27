package com.waxmes.app.ui.screens

import android.content.Context
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatListScreen(repo: Repository, onChatClick: (String) -> Unit, onSettingsClick: () -> Unit) {
    val t = LocalTheme.current
    val ctx = LocalContext.current
    var convs by remember { mutableStateOf<List<Conversation>>(emptyList()) }
    var showMenu by remember { mutableStateOf(false) }
    var searchQuery by remember { mutableStateOf("") }
    var isSearching by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        repo.getConversations { convs = it }
        repo.listenConversations { convs = it }
    }

    val filtered = if (searchQuery.isBlank()) convs else convs.filter {
        it.name.contains(searchQuery, ignoreCase = true) || it.lastMsg.contains(searchQuery, ignoreCase = true)
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
                        DropdownMenu(expanded = showMenu, onDismissRequest = { showMenu = false }, offset = DpOffset(0.dp, 4.dp),
                            containerColor = t.bg2) {
                            DropdownMenuItem(text = { Text("Settings", color = t.text) }, onClick = { showMenu = false; onSettingsClick() }, leadingIcon = { Icon(Icons.Default.Settings, contentDescription = null, tint = t.text3) })
                            DropdownMenuItem(text = { Text("Logout", color = Color(0xFFef4444)) }, onClick = { showMenu = false; repo.logout(); ctx.getSharedPreferences("waxmes", Context.MODE_PRIVATE).edit().clear().apply(); (ctx as? android.app.Activity)?.recreate() }, leadingIcon = { Icon(Icons.Default.Logout, contentDescription = null, tint = Color(0xFFef4444)) })
                        }
                    }
                }
            })
        }
    ) { padding ->
        LazyColumn(modifier = Modifier.fillMaxSize().padding(padding).background(t.bg).navigationBarsPadding(), contentPadding = PaddingValues(vertical = 4.dp)) {
            items(filtered) { conv ->
                Row(modifier = Modifier.fillMaxWidth().clickable { onChatClick(conv.id) }.padding(horizontal = 12.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                    Box(modifier = Modifier.size(48.dp).clip(CircleShape).background(Color(conv.color)), contentAlignment = Alignment.Center) {
                        Text(conv.name.first().uppercase(), color = t.text, fontWeight = FontWeight.Bold)
                    }
                    Spacer(Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(conv.name, color = t.text, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        if (conv.lastMsg.isNotEmpty()) Text(conv.lastMsg, color = t.text3, fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                    if (conv.unread > 0) Box(modifier = Modifier.size(20.dp).clip(CircleShape).background(Color(0xFFef4444)), contentAlignment = Alignment.Center) {
                        Text("${conv.unread}", color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
            if (filtered.isEmpty() && convs.isNotEmpty()) {
                item { Text("No conversations match", color = t.text4, modifier = Modifier.padding(20.dp).fillMaxWidth(), fontSize = 13.sp) }
            }
        }
    }
}