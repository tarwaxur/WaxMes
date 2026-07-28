package com.waxmes.app.ui.screens

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.DpOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.waxmes.app.data.Message
import com.waxmes.app.data.Repository
import com.waxmes.app.ui.theme.*
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class, ExperimentalFoundationApi::class)
@Composable
fun ChatScreen(repo: Repository, convId: String, onBack: () -> Unit) {
    val t = LocalTheme.current
    var msgs by remember { mutableStateOf<List<Message>>(emptyList()) }
    var text by remember { mutableStateOf("") }
    var convName by remember { mutableStateOf("") }
    var convAvatar by remember { mutableStateOf("") }
    var convOnline by remember { mutableStateOf(false) }
    var convIsGroup by remember { mutableStateOf(false) }
    var showProfileSheet by remember { mutableStateOf(false) }
    var mediaUri by remember { mutableStateOf<Uri?>(null) }
    var showChatMenu by remember { mutableStateOf(false) }
    var contextMsg by remember { mutableStateOf<Message?>(null) }
    val listState = rememberLazyListState()
    val clipboard = LocalClipboardManager.current
    val scope = rememberCoroutineScope()

    val mediaPickerLauncher = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        if (uri != null) {
            mediaUri = uri
            repo.uploadImage(uri) { downloadUrl ->
                if (downloadUrl != null) {
                    repo.sendMessage(convId, downloadUrl, isMedia = true)
                }
                mediaUri = null
            }
        }
    }

    LaunchedEffect(convId) {
        repo.listenMessages(convId) { msgs = it }
        repo.getConversationName(convId) { name -> convName = name }
        repo.getConversationStatus(convId) { displayName, online, avatar ->
            convName = displayName; convOnline = online; convAvatar = avatar
        }
    }
    LaunchedEffect(msgs.size) { if (msgs.isNotEmpty()) scope.launch { listState.animateScrollToItem(msgs.size - 1) } }

    if (showProfileSheet) {
        ModalBottomSheet(
            containerColor = t.bg2,
            shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
            onDismissRequest = { showProfileSheet = false }
        ) {
            Column(modifier = Modifier.fillMaxWidth().padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                Box(modifier = Modifier.size(72.dp).clip(CircleShape).background(t.bg3), contentAlignment = Alignment.Center) {
                    if (convAvatar.isNotEmpty()) {
                        AsyncImage(model = convAvatar, contentDescription = null,
                            modifier = Modifier.fillMaxSize().clip(CircleShape), contentScale = ContentScale.Crop)
                    } else {
                        Text(if (convName.isNotEmpty()) convName.first().uppercase() else "?", color = t.text2, fontSize = 30.sp, fontWeight = FontWeight.Bold)
                    }
                }
                Spacer(Modifier.height(14.dp))
                Text(convName.ifEmpty { "Unknown" }, color = t.text, fontSize = 22.sp, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(6.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(modifier = Modifier.size(9.dp).clip(CircleShape).background(if (convOnline) Color(0xFF22c55e) else t.text4))
                    Spacer(Modifier.width(6.dp))
                    Text(if (convOnline) "Online" else "Offline", color = t.text3, fontSize = 14.sp)
                }
                Spacer(Modifier.height(8.dp))
                Text("ID: ${repo.uid.take(12)}...", color = t.text4, fontSize = 11.sp)
                Spacer(Modifier.height(24.dp))
            }
        }
    }

    if (contextMsg != null) {
        val msg = contextMsg!!
        AlertDialog(onDismissRequest = { contextMsg = null },
            containerColor = t.bg2, shape = RoundedCornerShape(20.dp),
            title = { Text("Message Actions", color = t.text, fontWeight = FontWeight.Bold) },
            text = {
                Column {
                    Surface(shape = RoundedCornerShape(10.dp), color = t.bg3, modifier = Modifier.fillMaxWidth()) {
                        Text(msg.text.take(50) + if (msg.text.length > 50) "..." else "",
                            modifier = Modifier.padding(12.dp), color = t.text3, fontSize = 12.sp, maxLines = 2)
                    }
                    Spacer(Modifier.height(8.dp))
                    MsgActionItem(Icons.Default.ContentCopy, "Copy Text", t, t.text) {
                        clipboard.setText(AnnotatedString(msg.text)); contextMsg = null
                    }
                    MsgActionItem(Icons.Default.Reply, "Reply", t, t.text) { contextMsg = null }
                    MsgActionItem(Icons.Default.PushPin, "Pin Message", t, t.text) { contextMsg = null }
                    MsgActionItem(Icons.Default.Forward, "Forward", t, t.text) { contextMsg = null }
                    MsgActionItem(Icons.Default.Edit, "Edit", t, t.text) { contextMsg = null }
                    MsgActionItem(Icons.Default.Delete, "Delete", t, Color(0xFFef4444)) { contextMsg = null }
                }
            },
            confirmButton = { TextButton(onClick = { contextMsg = null }) { Text("Cancel", color = t.accent) } })
    }

    Scaffold(
        containerColor = t.bg,
        topBar = {
            TopAppBar(title = {
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.clickable { showProfileSheet = true }) {
                    Box(modifier = Modifier.size(38.dp).clip(CircleShape).background(t.bg3), contentAlignment = Alignment.Center) {
                        if (convAvatar.isNotEmpty()) {
                            AsyncImage(model = convAvatar, contentDescription = null,
                                modifier = Modifier.fillMaxSize().clip(CircleShape), contentScale = ContentScale.Crop)
                        } else {
                            Text(if (convName.isNotEmpty()) convName.first().uppercase() else "?", color = t.text2, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                        }
                    }
                    Spacer(Modifier.width(12.dp))
                    Column(verticalArrangement = Arrangement.Center) {
                        Spacer(Modifier.height(3.dp))
                        Text(convName.ifEmpty { "Loading..." }, color = t.text, fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(modifier = Modifier.size(6.dp).clip(CircleShape).background(if (convOnline) Color(0xFF22c55e) else t.text4))
                            Spacer(Modifier.width(5.dp))
                            Text(if (convOnline) "Online" else "Offline", color = t.text3, fontSize = 11.sp)
                        }
                    }
                }
            }, navigationIcon = {
                IconButton(onClick = onBack) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null, tint = t.text)
                }
            }, actions = {
                Box {
                    IconButton(onClick = { showChatMenu = true }) {
                        Icon(Icons.Default.MoreVert, contentDescription = null, tint = t.text)
                    }
                    DropdownMenu(expanded = showChatMenu, onDismissRequest = { showChatMenu = false },
                        offset = DpOffset(0.dp, 4.dp), containerColor = t.bg2) {
                        DropdownMenuItem(text = { Text("Pinned Messages", color = t.text) },
                            onClick = { showChatMenu = false }, leadingIcon = { Icon(Icons.Default.PushPin, contentDescription = null, tint = t.text3) })
                        DropdownMenuItem(text = { Text("Media Gallery", color = t.text) },
                            onClick = { showChatMenu = false }, leadingIcon = { Icon(Icons.Default.PhotoLibrary, contentDescription = null, tint = t.text3) })
                        DropdownMenuItem(text = { Text("Search", color = t.text) },
                            onClick = { showChatMenu = false }, leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = t.text3) })
                        DropdownMenuItem(text = { Text("Voice Call (Beta)", color = t.text) },
                            onClick = { showChatMenu = false }, leadingIcon = { Icon(Icons.Default.Phone, contentDescription = null, tint = t.text3) })
                    }
                }
            })
        },
        bottomBar = {
            Row(
                modifier = Modifier.fillMaxWidth()
                    .navigationBarsPadding()
                    .imePadding()
                    .background(t.bg2)
                    .padding(horizontal = 8.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = { mediaPickerLauncher.launch("image/*") }) {
                    Icon(Icons.Default.AttachFile, contentDescription = null, tint = t.text3, modifier = Modifier.size(24.dp))
                }
                Spacer(Modifier.width(4.dp))
                OutlinedTextField(value = text, onValueChange = { text = it },
                    placeholder = { Text("Message...", color = t.text4) },
                    modifier = Modifier.weight(1f), singleLine = true,
                    keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(
                        capitalization = KeyboardCapitalization.Sentences,
                        autoCorrectEnabled = true,
                        keyboardType = KeyboardType.Text,
                        imeAction = ImeAction.Send
                    ),
                    keyboardActions = androidx.compose.foundation.text.KeyboardActions(
                        onSend = { if (text.isNotBlank()) { repo.sendMessage(convId, text); text = "" } }
                    ),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = t.accent, unfocusedBorderColor = t.border2,
                        cursorColor = t.accent, focusedTextColor = t.text, unfocusedTextColor = t.text,
                        focusedContainerColor = t.bg, unfocusedContainerColor = t.bg
                    ),
                    shape = RoundedCornerShape(12.dp))
                Spacer(Modifier.width(6.dp))
                IconButton(onClick = {
                    if (text.isNotBlank()) { repo.sendMessage(convId, text); text = "" }
                }) { Icon(Icons.AutoMirrored.Filled.Send, contentDescription = null, tint = if (text.isNotBlank()) t.accent else t.text4, modifier = Modifier.size(26.dp)) }
            }
        }
    ) { padding ->
        LazyColumn(modifier = Modifier.fillMaxSize().padding(padding).background(t.bg),
            state = listState, contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp)) {
            items(msgs) { msg ->
                val isMine = msg.type == "sent"
                Column(modifier = Modifier.fillMaxWidth().padding(vertical = 2.dp), horizontalAlignment = if (isMine) Alignment.End else Alignment.Start) {
                    Surface(shape = RoundedCornerShape(14.dp, if (isMine) 14.dp else 4.dp, if (isMine) 4.dp else 14.dp, 14.dp),
                        color = if (isMine) t.accent.copy(alpha = 0.15f) else t.msgReceived,
                        modifier = Modifier.combinedClickable(
                            onClick = {},
                            onLongClick = { contextMsg = msg }
                        )) {
                        if (msg.image.isNotEmpty()) {
                            AsyncImage(model = msg.image, contentDescription = null,
                                modifier = Modifier.size(240.dp).clip(RoundedCornerShape(14.dp)),
                                contentScale = ContentScale.Crop)
                        } else {
                            Text(msg.text, modifier = Modifier.padding(horizontal = 14.dp, vertical = 9.dp), color = t.text, fontSize = 15.sp, maxLines = 10)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun MsgActionItem(icon: ImageVector, label: String, t: ThemeColors, tint: Color = t.text, onClick: () -> Unit) {
    Surface(shape = RoundedCornerShape(10.dp), color = t.bg3,
        modifier = Modifier.fillMaxWidth().padding(vertical = 2.dp).clickable(onClick = onClick)) {
        Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, contentDescription = null, tint = tint, modifier = Modifier.size(20.dp))
            Spacer(Modifier.width(12.dp))
            Text(label, color = tint, fontSize = 14.sp, fontWeight = FontWeight.Normal)
        }
    }
}