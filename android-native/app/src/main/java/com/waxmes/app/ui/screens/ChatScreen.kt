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
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items as gridItems
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
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.compose.ui.unit.DpOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import coil.compose.SubcomposeAsyncImage
import coil.compose.AsyncImagePainter
import com.waxmes.app.data.Conversation
import com.waxmes.app.data.Message
import com.waxmes.app.data.Repository
import com.waxmes.app.data.appLog
import androidx.compose.ui.graphics.vector.ImageVector
import android.webkit.WebChromeClient
import android.webkit.WebView
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import com.waxmes.app.data.LocalTranslations
import com.waxmes.app.data.translateSystemMessage
import com.waxmes.app.ui.screens.AvatarImage
import com.waxmes.app.ui.theme.*
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class, ExperimentalFoundationApi::class)
@Composable
fun ChatScreen(repo: Repository, convId: String, onBack: () -> Unit) {
    val t = LocalTheme.current
    val tr = LocalTranslations.current
    var msgs by remember { mutableStateOf<List<Message>>(emptyList()) }
    var text by remember { mutableStateOf(TextFieldValue("")) }
    val inputFocusRequester = remember { FocusRequester() }
    val keyboard = LocalSoftwareKeyboardController.current
    var convName by remember { mutableStateOf("") }
    var convAvatar by remember { mutableStateOf("") }
    var convOnline by remember { mutableStateOf(false) }
    var showProfileSheet by remember { mutableStateOf(false) }
    var mediaUri by remember { mutableStateOf<Uri?>(null) }
    var showChatMenu by remember { mutableStateOf(false) }
    var contextMsg by remember { mutableStateOf<Message?>(null) }
    var replyToMsg by remember { mutableStateOf<Message?>(null) }
    var editingMsg by remember { mutableStateOf<Message?>(null) }
    var editDraft by remember { mutableStateOf("") }
    var showPinned by remember { mutableStateOf(false) }
    var pinnedIds by remember { mutableStateOf<List<String>>(emptyList()) }
    var forwardMsg by remember { mutableStateOf<Message?>(null) }
    var forwardTargets by remember { mutableStateOf<List<Conversation>>(emptyList()) }
    var selectedIds by remember { mutableStateOf<Set<String>>(emptySet()) }
    var forwardCaption by remember { mutableStateOf("") }
    var showGallery by remember { mutableStateOf(false) }
    var viewMedia by remember { mutableStateOf<Message?>(null) }
    var showSearch by remember { mutableStateOf(false) }
    var searchQuery by remember { mutableStateOf("") }
    var highlightMsgId by remember { mutableStateOf<String?>(null) }
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
        editingMsg = null
        editDraft = ""
        showPinned = false
        pinnedIds = emptyList()
        forwardMsg = null
        selectedIds = emptySet()
        forwardCaption = ""
        showGallery = false
        viewMedia = null
        showSearch = false
        searchQuery = ""
        highlightMsgId = null
        text = TextFieldValue("")
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

    LaunchedEffect(highlightMsgId) {
        if (highlightMsgId != null) {
            delay(1500)
            highlightMsgId = null
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
            TargetMessageBar(mode = "reply", content = replyMsg.text, onClose = { replyToMsg = null; keyboard?.hide() })
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
                    MsgActionItem(Icons.Default.Reply, tr["reply"] ?: "Reply", t, t.text) {
                        replyToMsg = msg; contextMsg = null
                        scope.launch { delay(200); inputFocusRequester.requestFocus() }
                    }
                    MsgActionItem(Icons.Default.PushPin, tr["pin_message"] ?: "Pin Message", t, t.text) {
                        repo.togglePinMessage(convId, msg.id); contextMsg = null
                        appLog("Pin toggled for ${msg.id}")
                    }
                    MsgActionItem(Icons.Default.Forward, tr["forward"] ?: "Forward", t, t.text) {
                        forwardMsg = msg; selectedIds = emptySet(); forwardCaption = ""
                        repo.getConversations { forwardTargets = it }
                        contextMsg = null
                        appLog("Forward dialog opened for ${msg.id}")
                    }
                    MsgActionItem(Icons.Default.Edit, tr["edit"] ?: "Edit", t, t.text) {
                        if (msg.type == "sent" && !msg.deleted) {
                            editingMsg = msg; editDraft = msg.text
                            text = TextFieldValue(msg.text, TextRange(msg.text.length))
                            scope.launch { delay(200); inputFocusRequester.requestFocus() }
                            appLog("Editing message ${msg.id}")
                        }
                        contextMsg = null
                    }
                    MsgActionItem(Icons.Default.Delete, tr["delete"] ?: "Delete", t, Color(0xFFef4444)) { repo.deleteMessage(convId, msg.id); contextMsg = null; appLog("Message deleted") }
                }
            },
            confirmButton = { TextButton(onClick = { contextMsg = null }) { Text(tr["cancel"] ?: "Cancel", color = t.accent) } })
    }

    if (showPinned) {
        ModalBottomSheet(
            containerColor = t.bg2,
            shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
            onDismissRequest = { showPinned = false }
        ) {
            Text(tr["pinned"] ?: "Pinned Messages", color = t.text, fontSize = 16.sp, fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(20.dp, 16.dp, 20.dp, 8.dp))
            val pinnedMsgs = msgs.filter { pinnedIds.contains(it.id) && !it.deleted }
            if (pinnedMsgs.isEmpty()) {
                Text("📌 ${tr["no_pinned"] ?: "Sabitlenmiş mesaj yok."}", color = t.text4, fontSize = 12.sp,
                    modifier = Modifier.padding(24.dp).fillMaxWidth(), textAlign = TextAlign.Center)
            } else {
                Text("${pinnedMsgs.size} ${tr["messages"] ?: "messages"}", color = t.text4, fontSize = 11.sp,
                    modifier = Modifier.padding(horizontal = 20.dp))
                LazyColumn(modifier = Modifier.padding(vertical = 8.dp), contentPadding = PaddingValues(bottom = 24.dp)) {
                    items(pinnedMsgs) { msg ->
                        Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 4.dp)
                            .clip(RoundedCornerShape(10.dp)).clickable {
                                showPinned = false
                                val idx = msgs.indexOfFirst { it.id == msg.id }
                                if (idx >= 0) scope.launch { listState.animateScrollToItem(idx) }
                            }.padding(10.dp),
                            verticalAlignment = Alignment.CenterVertically) {
                            Box(modifier = Modifier.width(2.dp).height(34.dp).background(t.accent, RoundedCornerShape(1.dp)))
                            Spacer(Modifier.width(10.dp))
                            if (msg.image.isNotEmpty()) {
                                AsyncImage(model = msg.image, contentDescription = null,
                                    modifier = Modifier.size(36.dp).clip(RoundedCornerShape(6.dp)), contentScale = ContentScale.Crop)
                                Spacer(Modifier.width(8.dp))
                            } else if (msg.video.isNotEmpty()) {
                                Box(modifier = Modifier.size(36.dp).clip(RoundedCornerShape(6.dp)).background(t.bg3), contentAlignment = Alignment.Center) {
                                    Text("🎬", fontSize = 16.sp)
                                }
                                Spacer(Modifier.width(8.dp))
                            } else if (msg.audio.isNotEmpty()) {
                                Box(modifier = Modifier.size(36.dp).clip(RoundedCornerShape(6.dp)).background(t.bg3), contentAlignment = Alignment.Center) {
                                    Text("🎤", fontSize = 16.sp)
                                }
                                Spacer(Modifier.width(8.dp))
                            }
                            Column(modifier = Modifier.weight(1f)) {
                                Text((if (msg.text.isNotEmpty()) msg.text else tr["image"] ?: "📷 Image").take(120),
                                    color = t.text3, fontSize = 12.sp, maxLines = 2, overflow = TextOverflow.Ellipsis)
                                Spacer(Modifier.height(2.dp))
                                Text(msg.time, color = t.text4, fontSize = 10.sp)
                            }
                            IconButton(onClick = {
                                repo.togglePinMessage(convId, msg.id)
                                pinnedIds = pinnedIds - msg.id
                            }) {
                                Icon(Icons.Default.PushPin, contentDescription = null, tint = Color(0xFFef4444), modifier = Modifier.size(18.dp))
                            }
                        }
                    }
                }
            }
            Spacer(Modifier.height(8.dp))
        }
    }

    if (forwardMsg != null) {
        ModalBottomSheet(
            containerColor = t.bg2,
            shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
            onDismissRequest = { forwardMsg = null }
        ) {
            Text(tr["forward"] ?: "Forward", color = t.text, fontSize = 16.sp, fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(20.dp, 16.dp, 20.dp, 8.dp))
            OutlinedTextField(value = forwardCaption, onValueChange = { forwardCaption = it },
                placeholder = { Text(tr["forward_comment"] ?: "Add a comment...", color = t.text4, fontSize = 12.sp) },
                modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp), singleLine = true,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = t.accent.copy(alpha = 0.5f), unfocusedBorderColor = t.border2.copy(alpha = 0.3f),
                    cursorColor = t.accent, focusedTextColor = t.text, unfocusedTextColor = t.text,
                    focusedContainerColor = t.bg.copy(alpha = 0.5f), unfocusedContainerColor = t.bg.copy(alpha = 0.5f)
                ),
                shape = RoundedCornerShape(12.dp))
            val groups = forwardTargets.filter { it.isGroup }
            val friends = forwardTargets.filter { !it.isGroup }
            if (groups.isNotEmpty()) {
                Text(tr["groups"] ?: "Groups", color = t.text3, fontSize = 12.sp, fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.padding(20.dp, 14.dp, 20.dp, 4.dp))
                groups.forEach { conv ->
                    ForwardListRow(conv = conv, selected = selectedIds.contains(conv.id), t = t, tr = tr,
                        onToggle = { selectedIds = if (selectedIds.contains(conv.id)) selectedIds - conv.id else selectedIds + conv.id })
                }
            }
            if (friends.isNotEmpty()) {
                Text(tr["friends"] ?: "Friends", color = t.text3, fontSize = 12.sp, fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.padding(20.dp, 14.dp, 20.dp, 4.dp))
                friends.forEach { conv ->
                    ForwardListRow(conv = conv, selected = selectedIds.contains(conv.id), t = t, tr = tr,
                        onToggle = { selectedIds = if (selectedIds.contains(conv.id)) selectedIds - conv.id else selectedIds + conv.id })
                }
            }
            if (selectedIds.isNotEmpty()) {
                Button(onClick = {
                    val toSend = selectedIds.toList()
                    selectedIds.forEach { repo.forwardTo(it, forwardMsg!!, forwardCaption) }
                    forwardMsg = null; selectedIds = emptySet(); forwardCaption = ""
                    appLog("Forwarded to ${toSend.size} target(s)")
                }, modifier = Modifier.fillMaxWidth().padding(20.dp, 16.dp, 20.dp, 20.dp),
                    shape = RoundedCornerShape(14.dp), colors = ButtonDefaults.buttonColors(containerColor = t.accent)) {
                    Text(tr["send"] ?: "Send", color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                }
            } else {
                Spacer(Modifier.height(20.dp))
            }
        }
    }

    if (showGallery) {
        ModalBottomSheet(
            containerColor = t.bg2,
            shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
            onDismissRequest = { showGallery = false }
        ) {
            Text(tr["media"] ?: "Media Gallery", color = t.text, fontSize = 16.sp, fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(20.dp, 16.dp, 20.dp, 8.dp))
            val mediaMsgs = msgs.filter { !it.deleted && (it.image.isNotEmpty() || it.video.isNotEmpty()) }
            if (mediaMsgs.isEmpty()) {
                Text("📷 ${tr["no_media"] ?: "Medya bulunamadı."}", color = t.text4, fontSize = 12.sp,
                    modifier = Modifier.padding(24.dp).fillMaxWidth(), textAlign = TextAlign.Center)
            } else {
                LazyVerticalGrid(columns = GridCells.Fixed(3),
                    contentPadding = PaddingValues(12.dp),
                    modifier = Modifier.fillMaxWidth().navigationBarsPadding()) {
                    gridItems(mediaMsgs) { msg ->
                        MediaTile(msg = msg, t = t, onClick = { viewMedia = msg })
                    }
                }
            }
            Spacer(Modifier.height(8.dp))
        }
    }

    if (showSearch) {
        ModalBottomSheet(
            containerColor = t.bg2,
            shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
            onDismissRequest = { showSearch = false }
        ) {
            OutlinedTextField(value = searchQuery, onValueChange = { searchQuery = it },
                placeholder = { Text(tr["search"] ?: "Search...", color = t.text4) },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = t.text3) },
                trailingIcon = {
                    if (searchQuery.isNotEmpty()) IconButton(onClick = { searchQuery = "" }) {
                        Icon(Icons.Default.Close, contentDescription = null, tint = t.text4)
                    }
                },
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp), singleLine = true,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = t.accent.copy(alpha = 0.5f), unfocusedBorderColor = t.border2.copy(alpha = 0.3f),
                    cursorColor = t.accent, focusedTextColor = t.text, unfocusedTextColor = t.text,
                    focusedContainerColor = t.bg.copy(alpha = 0.5f), unfocusedContainerColor = t.bg.copy(alpha = 0.5f)
                ),
                shape = RoundedCornerShape(24.dp))
            val q = searchQuery.trim().lowercase()
            val filtered = msgs.filter { !it.deleted && it.text.isNotEmpty() && (q.isEmpty() || it.text.lowercase().contains(q)) }
            if (filtered.isEmpty()) {
                Text(tr["no_results"] ?: "Sonuç bulunamadı", color = t.text4, fontSize = 12.sp,
                    modifier = Modifier.padding(24.dp).fillMaxWidth(), textAlign = TextAlign.Center)
            } else {
                LazyColumn(modifier = Modifier.fillMaxWidth().navigationBarsPadding(),
                    contentPadding = PaddingValues(bottom = 24.dp)) {
                    filtered.groupBy { dateCategory(it.createdAt, tr) }.forEach { (cat, list) ->
                        item(key = "cat-$cat") {
                            Text(cat, color = t.text3, fontSize = 11.sp, fontWeight = FontWeight.SemiBold,
                                modifier = Modifier.padding(20.dp, 14.dp, 20.dp, 4.dp))
                        }
                        items(list, key = { it.id }) { msg ->
                            Row(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).clickable {
                                showSearch = false
                                val idx = msgs.indexOfFirst { it.id == msg.id }
                                if (idx >= 0) scope.launch {
                                    listState.animateScrollToItem(idx)
                                    highlightMsgId = msg.id
                                }
                            }.padding(horizontal = 20.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(highlightedText(if (msg.text.isNotEmpty()) msg.text else tr["image"] ?: "📷 Image", q, t),
                                        color = t.text2, fontSize = 13.sp, maxLines = 2, overflow = TextOverflow.Ellipsis)
                                    Spacer(Modifier.height(2.dp))
                                    Text(msg.time, color = t.text4, fontSize = 10.sp)
                                }
                            }
                        }
                    }
                }
            }
            Spacer(Modifier.height(8.dp))
        }
    }

    if (viewMedia != null) {
        Dialog(onDismissRequest = { viewMedia = null },
            properties = DialogProperties(usePlatformDefaultWidth = false)) {
            Box(modifier = Modifier.fillMaxSize().background(Color.Black).clickable { viewMedia = null },
                contentAlignment = Alignment.Center) {
                val m = viewMedia!!
                if (m.image.isNotEmpty()) {
                    AsyncImage(model = m.image, contentDescription = null,
                        modifier = Modifier.fillMaxSize(), contentScale = ContentScale.Fit)
                } else if (m.video.isNotEmpty()) {
                    AndroidView(factory = { ctx ->
                        WebView(ctx).apply {
                            setBackgroundColor(android.graphics.Color.BLACK)
                            settings.javaScriptEnabled = true
                            settings.mediaPlaybackRequiresUserGesture = false
                            webChromeClient = WebChromeClient()
                            val html = "<html><body style='margin:0;background:#000'><video src='${m.video}' controls autoplay playsinline style='width:100vw;height:100vh;object-fit:contain'></video></body></html>"
                            loadDataWithBaseURL(null, html, "text/html", "utf-8", null)
                        }
                    }, modifier = Modifier.fillMaxSize())
                }
            }
        }
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
                                onClick = {
                                    showChatMenu = false; showPinned = true
                                    repo.getConversationPinnedIds(convId) { pinnedIds = it }
                                },
                                leadingIcon = { Icon(Icons.Default.PushPin, contentDescription = null, tint = t.text3) })
                            DropdownMenuItem(text = { Text(tr["media"] ?: "Media Gallery", color = t.text) },
                                onClick = { showChatMenu = false; showGallery = true },
                                leadingIcon = { Icon(Icons.Default.PhotoLibrary, contentDescription = null, tint = t.text3) })
                            DropdownMenuItem(text = { Text(tr["search"] ?: "Search", color = t.text) },
                                onClick = { showChatMenu = false; showSearch = true; searchQuery = "" },
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
                    Column {
                        if (editingMsg != null) {
                            TargetMessageBar(mode = "edit", content = editDraft, onClose = { editingMsg = null; editDraft = ""; text = TextFieldValue(""); keyboard?.hide() })
                        }
                        Row(
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                        IconButton(onClick = { mediaPickerLauncher.launch("image/*") }) {
                            Icon(Icons.Default.AttachFile, contentDescription = null, tint = t.text3, modifier = Modifier.size(22.dp))
                        }
                        Spacer(Modifier.width(2.dp))
                        OutlinedTextField(value = text, onValueChange = { text = it },
                            placeholder = { Text(
                                when {
                                    editingMsg != null -> tr["edit_text"] ?: "Edit..."
                                    replyToMsg != null -> tr["reply_text"] ?: "Reply..."
                                    else -> tr["message_text"] ?: "Message..."
                                }, color = t.text4) },
                            modifier = Modifier.weight(1f).focusRequester(inputFocusRequester), singleLine = true,
                            keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(
                                capitalization = KeyboardCapitalization.Sentences, autoCorrectEnabled = true,
                                keyboardType = KeyboardType.Text, imeAction = ImeAction.Send
                            ),
                            keyboardActions = androidx.compose.foundation.text.KeyboardActions(
                                onSend = {
                                    if (text.text.isNotBlank()) {
                                        if (editingMsg != null) {
                                            repo.editMessage(convId, editingMsg!!.id, text.text)
                                            editingMsg = null; editDraft = ""
                                        } else if (replyToMsg != null) {
                                            val replyText = if (replyToMsg!!.text.isNotEmpty()) replyToMsg!!.text else tr["image"] ?: "📷 Image"
                                            repo.sendMessage(convId, text.text, replyToId = replyToMsg!!.id, replyToText = replyText)
                                        } else {
                                            repo.sendMessage(convId, text.text)
                                        }
                                        text = TextFieldValue(""); replyToMsg = null
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
                        Surface(shape = CircleShape, color = if (text.text.isNotBlank()) t.accent else t.text4.copy(alpha = 0.3f),
                            modifier = Modifier.size(40.dp)) {
                            IconButton(onClick = {
                                if (text.text.isNotBlank()) {
                                    if (editingMsg != null) {
                                        repo.editMessage(convId, editingMsg!!.id, text.text)
                                        editingMsg = null; editDraft = ""
                                    } else if (replyToMsg != null) {
                                        val replyText = if (replyToMsg!!.text.isNotEmpty()) replyToMsg!!.text else tr["image"] ?: "📷 Image"
                                        repo.sendMessage(convId, text.text, replyToId = replyToMsg!!.id, replyToText = replyText)
                                    } else {
                                        repo.sendMessage(convId, text.text)
                                    }
                                    text = TextFieldValue(""); replyToMsg = null
                                }
                            }) { Icon(Icons.AutoMirrored.Filled.Send, contentDescription = null, tint = Color.White, modifier = Modifier.size(20.dp)) }
                        }
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
                            color = when {
                                msg.id == highlightMsgId -> t.accent.copy(alpha = 0.4f)
                                isMine -> t.accent.copy(alpha = 0.15f)
                                else -> t.msgReceived
                            },
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
                                if (msg.isForwarded) {
                                    Text("📤 ${tr["forwarded"] ?: "Forwarded"}", modifier = Modifier.padding(horizontal = 16.dp, vertical = 2.dp), color = t.text4, fontSize = 9.sp, fontWeight = FontWeight.Medium)
                                }
                                if (msg.forwardComment.isNotEmpty()) {
                                    Text("💬 ${msg.forwardComment}", modifier = Modifier.padding(horizontal = 16.dp, vertical = 2.dp), color = t.text4, fontSize = 11.sp)
                                }
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
                                    if (msg.text.isNotEmpty()) Text(translateSystemMessage(msg.text, tr), modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp), color = t.text3, fontSize = 12.sp)
                                } else if (msg.text.isNotEmpty()) {
                                    Text(translateSystemMessage(msg.text, tr), modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp), color = t.text, fontSize = 15.sp, maxLines = 10)
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

@Composable
private fun TargetMessageBar(mode: String, content: String, onClose: () -> Unit) {
    val t = LocalTheme.current
    val tr = LocalTranslations.current
    Surface(color = t.bg3, shadowElevation = 2.dp, modifier = Modifier.fillMaxWidth()) {
        Row(Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.width(3.dp).height(40.dp).background(t.accent, RoundedCornerShape(2.dp)))
            Spacer(Modifier.width(10.dp))
            Column(Modifier.weight(1f)) {
                Text(
                    text = if (mode == "reply") (tr["replying"] ?: "Replying")
                           else (tr["editing"] ?: "Editing"),
                    color = t.accent, fontSize = 11.sp, fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = content.ifEmpty { tr["image"] ?: "📷 Image" },
                    color = t.text3, fontSize = 12.sp, maxLines = 3,
                    overflow = TextOverflow.Ellipsis
                )
            }
            IconButton(onClick = onClose) {
                Icon(Icons.Default.Close, contentDescription = null, tint = t.text4, modifier = Modifier.size(18.dp))
            }
        }
    }
}

@Composable
private fun ForwardListRow(conv: Conversation, selected: Boolean, t: ThemeColors, tr: Map<String, String>, onToggle: () -> Unit) {
    Row(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).clickable(onClick = onToggle).padding(horizontal = 20.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically) {
        Box(modifier = Modifier.size(38.dp).clip(CircleShape).background(if (conv.isGroup) Color(0xFF6366f1) else Color(conv.color)), contentAlignment = Alignment.Center) {
            if (conv.isGroup) Text(tr["g"] ?: "G", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
            else AvatarImage(url = conv.avatarUrl, fallbackText = conv.name,
                modifier = Modifier.fillMaxSize(), bgColor = Color(conv.color), textColor = Color.White, fontSize = 14.sp)
        }
        Spacer(Modifier.width(12.dp))
        Text(conv.name, color = t.text, fontSize = 14.sp, fontWeight = FontWeight.Medium, maxLines = 1, overflow = TextOverflow.Ellipsis,
            modifier = Modifier.weight(1f))
        if (selected) Icon(Icons.Default.CheckCircle, contentDescription = null, tint = t.accent, modifier = Modifier.size(22.dp))
        else Icon(Icons.Default.RadioButtonUnchecked, contentDescription = null, tint = t.text4, modifier = Modifier.size(22.dp))
    }
}

@Composable
private fun MediaTile(msg: Message, t: ThemeColors, onClick: () -> Unit) {
    Box(modifier = Modifier.aspectRatio(1f).clip(RoundedCornerShape(8.dp)).clickable(onClick = onClick).background(t.bg3)) {
        if (msg.image.isNotEmpty()) {
            AsyncImage(model = msg.image, contentDescription = null,
                contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
        } else if (msg.video.isNotEmpty()) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Icon(Icons.Default.PlayArrow, contentDescription = null, tint = Color.White, modifier = Modifier.size(32.dp))
            }
        }
    }
}

private fun dateCategory(date: Date, tr: Map<String, String>): String {
    val todayStart = Calendar.getInstance().apply {
        set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0); set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
    }
    val msgStart = Calendar.getInstance().apply {
        time = date
        set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0); set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
    }
    val diffDays = ((todayStart.timeInMillis - msgStart.timeInMillis) / 86400000L).toInt()
    return when {
        diffDays <= 0 -> tr["today"] ?: "Bugün"
        diffDays == 1 -> tr["yesterday"] ?: "Dün"
        else -> SimpleDateFormat("d MMMM", Locale.getDefault()).format(date)
    }
}

private fun highlightedText(full: String, query: String, t: ThemeColors): AnnotatedString {
    return buildAnnotatedString {
        if (query.isEmpty() || !full.lowercase().contains(query)) {
            append(full)
            return@buildAnnotatedString
        }
        var start = 0
        val lower = full.lowercase()
        while (true) {
            val idx = lower.indexOf(query, start)
            if (idx == -1) {
                append(full.substring(start))
                break
            }
            append(full.substring(start, idx))
            withStyle(SpanStyle(color = t.accent, fontWeight = FontWeight.Bold)) {
                append(full.substring(idx, idx + query.length))
            }
            start = idx + query.length
        }
    }
}