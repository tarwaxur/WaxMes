package com.waxmes.app.ui.screens

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.*
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
import coil.compose.SubcomposeAsyncImage
import coil.compose.AsyncImagePainter
import com.waxmes.app.data.Message
import com.waxmes.app.data.Repository
import com.waxmes.app.data.appLog
import androidx.compose.ui.graphics.vector.ImageVector
import kotlinx.coroutines.launch
import com.waxmes.app.data.LocalTranslations
import com.waxmes.app.ui.screens.AvatarImage
import com.waxmes.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class, ExperimentalFoundationApi::class)
@Composable
fun ChatScreen(repo: Repository, convId: String, onBack: () -> Unit) {
    val t = LocalTheme.current
    val tr = LocalTranslations.current
    var msgs by remember { mutableStateOf<List<Message>>(emptyList()) }
    var text by remember { mutableStateOf("") }
    var convName by remember { mutableStateOf("") }
    var convAvatar by remember { mutableStateOf("") }
    var convOnline by remember { mutableStateOf(false) }
    var showProfileSheet by remember { mutableStateOf(false) }
    var mediaUri by remember { mutableStateOf<Uri?>(null) }
    var showChatMenu by remember { mutableStateOf(false) }
    var contextMsg by remember { mutableStateOf<Message?>(null) }
    var replyToMsg by remember { mutableStateOf<Message?>(null) }
    var unreadCount by remember { mutableIntStateOf(0) }
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
        // Reset states when conversation changes
        replyToMsg = null
        text = ""
        mediaUri = null
        showProfileSheet = false
        repo.listenMessages(convId) { msgs = it }
        repo.getConversationName(convId) { name -> convName = name }
        repo.getConversationStatus(convId) { displayName, online, avatar ->
            convName = displayName; convOnline = online; convAvatar = avatar
        }
    }

    LaunchedEffect(msgs.size) {
        if (msgs.isNotEmpty()) {
            val lastIndex = msgs.size - 1
            val lastVisible = listState.layoutInfo.visibleItemsInfo.lastOrNull()?.index
            if (lastVisible == null || lastVisible >= lastIndex - 1) {
                listState.scrollToItem(lastIndex)
                unreadCount = 0
            } else {
                unreadCount = msgs.size - 1 - (lastVisible ?: 0)
            }
        }
    }

    val notAtBottom = remember {
        derivedStateOf {
            val info = listState.layoutInfo
            info.visibleItemsInfo.lastOrNull()?.index != msgs.size - 1 && msgs.isNotEmpty()
        }
    }

    if (showProfileSheet) {
        ModalBottomSheet(
            containerColor = t.bg2,
            shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
            onDismissRequest = { showProfileSheet = false }
        ) {
            Column(modifier = Modifier.fillMaxWidth().padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Box(modifier = Modifier.size(72.dp).clip(CircleShape).background(t.bg3), contentAlignment = Alignment.Center) {
                        AvatarImage(url = convAvatar, fallbackText = convName,
                            modifier = Modifier.fillMaxSize(), textColor = t.text2, fontSize = 30.sp)
                    }
                Spacer(Modifier.height(14.dp))
                Text(convName.ifEmpty { tr["unknown"] ?: "Unknown" }, color = t.text, fontSize = 22.sp, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(6.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(modifier = Modifier.size(9.dp).clip(CircleShape).background(if (convOnline) Color(0xFF22c55e) else t.text4))
                    Spacer(Modifier.width(6.dp))
                    Text(if (convOnline) tr["online"] ?: "Online" else tr["offline"] ?: "Offline", color = t.text3, fontSize = 14.sp)
                }
                Spacer(Modifier.height(8.dp))
                Text("${tr["id_label"] ?: "ID: "}${repo.uid.take(12)}...", color = t.text4, fontSize = 11.sp)
                Spacer(Modifier.height(24.dp))
            }
        }
    }

    // Reply bar
    AnimatedVisibility(visible = replyToMsg != null, enter = slideInVertically { it }, exit = slideOutVertically { it }) {
        replyToMsg?.let { replyMsg ->
            Surface(color = t.bg3, shadowElevation = 2.dp) {
                Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                    Box(modifier = Modifier.width(3.dp).height(32.dp).background(t.accent, RoundedCornerShape(2.dp)))
                    Spacer(Modifier.width(10.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(tr["replying"] ?: "Replying", color = t.accent, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                        Text(replyMsg.text.ifEmpty { tr["image"] ?: "📷 Image" }, color = t.text3, fontSize = 12.sp, maxLines = 1)
                    }
                    IconButton(onClick = { replyToMsg = null }) {
                        Icon(Icons.Default.Close, contentDescription = null, tint = t.text4, modifier = Modifier.size(18.dp))
                    }
                }
            }
        }
    }

    if (contextMsg != null) {
        val msg = contextMsg!!
        AlertDialog(onDismissRequest = { contextMsg = null },
            containerColor = t.bg2, shape = RoundedCornerShape(20.dp),
            title = { Text(tr["message_actions"] ?: "Message Actions", color = t.text, fontWeight = FontWeight.Bold) },
            text = {
                Column {
                    Surface(shape = RoundedCornerShape(10.dp), color = t.bg3, modifier = Modifier.fillMaxWidth()) {
                        Text((if (msg.text.isNotEmpty()) msg.text else tr["image"] ?: "📷 Image").take(50) + if (msg.text.length > 50) "..." else "",
                            modifier = Modifier.padding(12.dp), color = t.text3, fontSize = 12.sp, maxLines = 2)
                    }
                    Spacer(Modifier.height(8.dp))
                    MsgActionItem(Icons.Default.ContentCopy, tr["copy_text"] ?: "Copy Text", t, t.text) {
                        clipboard.setText(AnnotatedString(if (msg.text.isNotEmpty()) msg.text else tr["image"] ?: "📷 Image")); contextMsg = null
                        appLog("Text copied to clipboard")
                    }
                    MsgActionItem(Icons.Default.Reply, tr["reply"] ?: "Reply", t, t.text) { replyToMsg = msg; contextMsg = null }
                    MsgActionItem(Icons.Default.PushPin, tr["pin_message"] ?: "Pin Message", t, t.text) { appLog("Pin - coming soon"); contextMsg = null }
                    MsgActionItem(Icons.Default.Forward, tr["forward"] ?: "Forward", t, t.text) { repo.forwardMessage(convId, if (msg.text.isNotEmpty()) msg.text else tr["image"] ?: "📷 Image", msg.id); contextMsg = null; appLog("Message forwarded") }
                    MsgActionItem(Icons.Default.Edit, tr["edit"] ?: "Edit", t, t.text) { appLog("Edit - coming soon"); contextMsg = null }
                    MsgActionItem(Icons.Default.Delete, tr["delete"] ?: "Delete", t, Color(0xFFef4444)) { repo.deleteMessage(convId, msg.id); contextMsg = null; appLog("Message deleted") }
                }
            },
            confirmButton = { TextButton(onClick = { contextMsg = null }) { Text(tr["cancel"] ?: "Cancel", color = t.accent) } })
    }

    Box(modifier = Modifier.fillMaxSize()) {
        Scaffold(
            containerColor = t.bg,
            topBar = {
                TopAppBar(title = {
                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.clip(RoundedCornerShape(12.dp)).clickable { showProfileSheet = true }) {
                    Box(modifier = Modifier.size(38.dp).clip(CircleShape).background(t.bg3), contentAlignment = Alignment.Center) {
                        AvatarImage(url = convAvatar, fallbackText = convName,
                            modifier = Modifier.fillMaxSize(), textColor = t.text2, fontSize = 16.sp)
                    }
                        Spacer(Modifier.width(12.dp))
                        Column {
                            Spacer(Modifier.height(2.dp))
                            Text(convName.ifEmpty { tr["loading"] ?: "Loading..." }, color = t.text, fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(modifier = Modifier.size(6.dp).clip(CircleShape).background(if (convOnline) Color(0xFF22c55e) else t.text4))
                                Spacer(Modifier.width(5.dp))
                                Text(if (convOnline) tr["online"] ?: "Online" else tr["offline"] ?: "Offline", color = t.text3, fontSize = 11.sp)
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
                            shape = RoundedCornerShape(20.dp),
                            offset = DpOffset(0.dp, 4.dp), containerColor = t.bg2) {
                            DropdownMenuItem(text = { Text(tr["pinned"] ?: "Pinned Messages", color = t.text) },
                                onClick = { showChatMenu = false; appLog("Pinned messages - coming soon") },
                                leadingIcon = { Icon(Icons.Default.PushPin, contentDescription = null, tint = t.text3) })
                            DropdownMenuItem(text = { Text(tr["media"] ?: "Media Gallery", color = t.text) },
                                onClick = { showChatMenu = false; appLog("Media gallery - coming soon") },
                                leadingIcon = { Icon(Icons.Default.PhotoLibrary, contentDescription = null, tint = t.text3) })
                            DropdownMenuItem(text = { Text(tr["search"] ?: "Search", color = t.text) },
                                onClick = { showChatMenu = false; appLog("Search - coming soon") },
                                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = t.text3) })
                            DropdownMenuItem(text = { Text(tr["voice_call"] ?: "Voice Call (Beta)", color = t.text) },
                                onClick = { showChatMenu = false; appLog("Voice call - coming soon") },
                                leadingIcon = { Icon(Icons.Default.Phone, contentDescription = null, tint = t.text3) })
                        }
                    }
                })
            },
            bottomBar = {
                Surface(
                    shape = RoundedCornerShape(28.dp),
                    color = t.bg2.copy(alpha = 0.92f),
                    shadowElevation = 8.dp,
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 10.dp, vertical = 6.dp).navigationBarsPadding().imePadding()
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        IconButton(onClick = { mediaPickerLauncher.launch("image/*") }) {
                            Icon(Icons.Default.AttachFile, contentDescription = null, tint = t.text3, modifier = Modifier.size(22.dp))
                        }
                        Spacer(Modifier.width(2.dp))
                        OutlinedTextField(value = text, onValueChange = { text = it },
                            placeholder = { Text(if (replyToMsg != null) tr["reply_text"] ?: "Reply..." else tr["message_text"] ?: "Message...", color = t.text4) },
                            modifier = Modifier.weight(1f), singleLine = true,
                            keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(
                                capitalization = KeyboardCapitalization.Sentences, autoCorrectEnabled = true,
                                keyboardType = KeyboardType.Text, imeAction = ImeAction.Send
                            ),
                            keyboardActions = androidx.compose.foundation.text.KeyboardActions(
                                onSend = {
                                    if (text.isNotBlank()) {
                                        if (replyToMsg != null) {
                                            val replyText = if (replyToMsg!!.text.isNotEmpty()) replyToMsg!!.text else tr["image"] ?: "📷 Image"
                                            repo.sendMessage(convId, text, replyToId = replyToMsg!!.id, replyToText = replyText)
                                        } else {
                                            repo.sendMessage(convId, text)
                                        }
                                        text = ""; replyToMsg = null
                                    }
                                }
                            ),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = t.accent.copy(alpha = 0.5f), unfocusedBorderColor = t.border2.copy(alpha = 0.3f),
                                cursorColor = t.accent, focusedTextColor = t.text, unfocusedTextColor = t.text,
                                focusedContainerColor = t.bg.copy(alpha = 0.5f), unfocusedContainerColor = t.bg.copy(alpha = 0.5f)
                            ),
                            shape = RoundedCornerShape(24.dp))
                        Spacer(Modifier.width(4.dp))
                        Surface(shape = CircleShape, color = if (text.isNotBlank()) t.accent else t.text4.copy(alpha = 0.3f),
                            modifier = Modifier.size(40.dp)) {
                            IconButton(onClick = {
                                if (text.isNotBlank()) {
                                    if (replyToMsg != null) {
                                        val replyText = if (replyToMsg!!.text.isNotEmpty()) replyToMsg!!.text else tr["image"] ?: "📷 Image"
                                        repo.sendMessage(convId, text, replyToId = replyToMsg!!.id, replyToText = replyText)
                                    } else {
                                        repo.sendMessage(convId, text)
                                    }
                                    text = ""; replyToMsg = null
                                }
                            }) { Icon(Icons.AutoMirrored.Filled.Send, contentDescription = null, tint = Color.White, modifier = Modifier.size(20.dp)) }
                        }
                    }
                }
            }
        ) { padding ->
            LazyColumn(modifier = Modifier.fillMaxSize().padding(padding).background(t.bg).imePadding(),
                state = listState, contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp)) {
                items(msgs) { msg ->
                    val isMine = msg.type == "sent"
                    Column(modifier = Modifier.fillMaxWidth().padding(vertical = 2.dp), horizontalAlignment = if (isMine) Alignment.End else Alignment.Start) {
                        Surface(shape = RoundedCornerShape(18.dp, if (isMine) 18.dp else 4.dp, if (isMine) 4.dp else 18.dp, 18.dp),
                            color = if (isMine) t.accent.copy(alpha = 0.15f) else t.msgReceived,
                            modifier = Modifier.clip(RoundedCornerShape(18.dp, if (isMine) 18.dp else 4.dp, if (isMine) 4.dp else 18.dp, 18.dp))
                                .combinedClickable(
                                    onClick = {},
                                    onLongClick = { if (!msg.deleted) contextMsg = msg }
                                )) {
                            if (msg.deleted) {
                                Text(if (isMine) tr["deleted_by_you"] ?: "Bu mesajı sildiniz" else tr["deleted_msg"] ?: "Bu mesaj silindi",
                                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp),
                                    color = t.text4, fontSize = 13.sp, fontStyle = androidx.compose.ui.text.font.FontStyle.Italic)
                            } else {
                            Column {
                                if (msg.replyTo.isNotEmpty()) {
                                    Row(modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                                        Box(modifier = Modifier.width(3.dp).height(28.dp).background(t.accent.copy(alpha = 0.6f), RoundedCornerShape(2.dp)))
                                        Spacer(Modifier.width(8.dp))
                                        Text(msg.replyText.ifEmpty { tr["image"] ?: "📷 Image" }, color = t.text4, fontSize = 11.sp, maxLines = 1, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis)
                                    }
                                }
                                if (msg.image.isNotEmpty()) {
                                    AsyncImage(model = msg.image, contentDescription = null,
                                        modifier = Modifier.size(240.dp).clip(RoundedCornerShape(18.dp)).padding(4.dp),
                                        contentScale = ContentScale.Crop)
                                    if (msg.text.isNotEmpty()) Text(msg.text, modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp), color = t.text3, fontSize = 12.sp)
                                } else if (msg.text.isNotEmpty()) {
                                    Text(msg.text, modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp), color = t.text, fontSize = 15.sp, maxLines = 10)
                                }
                                }
                            }
                        }
                    }
                }
            }
        }

        // Scroll-to-bottom FAB
        AnimatedVisibility(visible = notAtBottom.value,
            enter = slideInVertically { it * 2 } + fadeIn(), exit = slideOutVertically { it * 2 } + fadeOut(),
            modifier = Modifier.align(Alignment.BottomEnd).padding(end = 16.dp, bottom = if (replyToMsg != null) 16.dp else 80.dp)) {
            Surface(shape = CircleShape, color = t.accent, shadowElevation = 8.dp,
                modifier = Modifier.size(48.dp).clickable {
                    if (msgs.isNotEmpty()) { scope.launch { listState.animateScrollToItem(msgs.size - 1) }; unreadCount = 0 }
                }) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(Icons.Default.KeyboardArrowDown, contentDescription = null, tint = Color.White, modifier = Modifier.size(26.dp))
                    if (unreadCount > 0) {
                        Box(modifier = Modifier.align(Alignment.TopEnd).offset(x = 4.dp, y = (-4).dp).size(20.dp).clip(CircleShape).background(Color(0xFFef4444)),
                            contentAlignment = Alignment.Center) {
                            Text("${if (unreadCount > 9) 9 else unreadCount}", color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun MsgActionItem(icon: ImageVector, label: String, t: ThemeColors, tint: Color, onClick: () -> Unit) {
    Surface(shape = RoundedCornerShape(12.dp), color = t.bg3,
        modifier = Modifier.fillMaxWidth().padding(vertical = 2.dp).clip(RoundedCornerShape(12.dp)).clickable(onClick = onClick)) {
        Row(modifier = Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, contentDescription = null, tint = tint, modifier = Modifier.size(20.dp))
            Spacer(Modifier.width(14.dp))
            Text(label, color = tint, fontSize = 14.sp, fontWeight = FontWeight.Medium)
        }
    }
}