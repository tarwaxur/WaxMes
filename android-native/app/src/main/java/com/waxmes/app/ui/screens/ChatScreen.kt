package com.waxmes.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Send
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.waxmes.app.data.Message
import com.waxmes.app.data.Repository
import com.waxmes.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatScreen(repo: Repository, convId: String, onBack: () -> Unit) {
    var msgs by remember { mutableStateOf<List<Message>>(emptyList()) }
    var text by remember { mutableStateOf("") }
    val listState = rememberLazyListState()

    LaunchedEffect(convId) { repo.listenMessages(convId) { msgs = it } }
    LaunchedEffect(msgs.size) { if (msgs.isNotEmpty()) listState.animateScrollToItem(msgs.size - 1) }

    Scaffold(
        containerColor = Bg,
        topBar = { TopAppBar(title = { Text("Sohbet", color = Text) }, navigationIcon = {
            IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, contentDescription = null, tint = Text) }
        }) },
        bottomBar = {
            Surface(color = InputBg) {
                Row(modifier = Modifier.padding(8.dp).fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    OutlinedTextField(value = text, onValueChange = { text = it }, placeholder = { Text("Mesaj yaz...", color = Text4) },
                        modifier = Modifier.weight(1f), singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Accent, unfocusedBorderColor = Border2, cursorColor = Accent, focusedTextColor = Text, unfocusedTextColor = Text, focusedContainerColor = Surface, unfocusedContainerColor = Surface),
                        shape = RoundedCornerShape(10.dp))
                    Spacer(Modifier.width(8.dp))
                    IconButton(onClick = { if (text.isNotBlank()) { repo.sendMessage(convId, text); text = "" } }) { Icon(Icons.Default.Send, contentDescription = null, tint = Accent) }
                }
            }
        }
    ) { padding ->
        LazyColumn(modifier = Modifier.fillMaxSize().padding(padding).background(Bg), state = listState, contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp)) {
            items(msgs) { msg ->
                val isMine = msg.type == "sent"
                Column(modifier = Modifier.fillMaxWidth().padding(vertical = 2.dp), horizontalAlignment = if (isMine) Alignment.End else Alignment.Start) {
                    Surface(shape = RoundedCornerShape(12.dp, if (isMine) 12.dp else 4.dp, if (isMine) 4.dp else 12.dp, 12.dp), color = if (isMine) Accent.copy(alpha = 0.15f) else Surface2) {
                        Text(msg.text, modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp), color = Text, fontSize = 14.sp, maxLines = 10)
                    }
                }
            }
        }
    }
}