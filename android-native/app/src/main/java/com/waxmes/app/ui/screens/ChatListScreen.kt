package com.waxmes.app.ui.screens

import android.content.Context
import android.net.Uri
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.*
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.DpOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.SubcomposeAsyncImage
import com.waxmes.app.data.Conversation
import com.waxmes.app.data.Repository
import com.waxmes.app.data.Story
import com.waxmes.app.data.LocalTranslations
import com.waxmes.app.ui.theme.*
import kotlinx.coroutines.launch
import androidx.compose.material3.pulltorefresh.PullToRefreshBox

@OptIn(ExperimentalMaterial3Api::class, ExperimentalFoundationApi::class)
@Composable
fun ChatListScreen(repo: Repository, onChatClick: (String) -> Unit, onSettingsClick: () -> Unit) {
    val t = LocalTheme.current
    val tr = LocalTranslations.current
    val ctx = LocalContext.current
    val prefs = ctx.getSharedPreferences("waxmes", Context.MODE_PRIVATE)
    var convs by remember { mutableStateOf<List<Conversation>>(emptyList()) }
    var showMenu by remember { mutableStateOf(false) }
    var searchQuery by remember { mutableStateOf("") }
    var isSearching by remember { mutableStateOf(false) }
    var contextConv by remember { mutableStateOf<Conversation?>(null) }
    var storiesList by remember { mutableStateOf<List<Story>>(emptyList()) }
    var isRefreshing by remember { mutableStateOf(false) }
    val refreshScope = rememberCoroutineScope()

    LaunchedEffect(isRefreshing) {
        if (isRefreshing) {
            kotlinx.coroutines.delay(3000)
            isRefreshing = false
        }
    }

    val doRefresh: () -> Unit = {
        isRefreshing = true
        repo.getConversations { list ->
            convs = list.map { c -> c.copy(isPinned = prefs.getBoolean("pin_${c.id}", false), isMuted = prefs.getBoolean("mute_${c.id}", false), isArchived = prefs.getBoolean("arch_${c.id}", false)) }
        }
    }

    var myNameInitial by remember { mutableStateOf("?") }
    var selectedTab by remember { mutableStateOf("chats") }
    var friends by remember { mutableStateOf<List<Conversation>>(emptyList()) }
    var showStoryViewer by remember { mutableStateOf(false) }
    var selectedStory by remember { mutableStateOf<Story?>(null) }
    var showAddFriend by remember { mutableStateOf(false) }

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
        repo.listenStories { storiesList = it }
        if (repo.uid.isNotEmpty()) {
            repo.fetchUserName(repo.uid) { name -> myNameInitial = name.first().uppercase().toString() }
        }
    }

    val displayConvs = if (searchQuery.isBlank()) {
        convs.filter { !it.isArchived }
    } else {
        convs.filter { !it.isArchived && (it.name.contains(searchQuery, ignoreCase = true) || it.lastMsg.contains(searchQuery, ignoreCase = true)) }
    }.sortedWith(compareByDescending<Conversation> { it.isPinned }.thenByDescending { it.lastActivity })

    Scaffold(
        containerColor = t.bg,
        topBar = {
            TopAppBar(title = {
                if (isSearching) {
                    OutlinedTextField(value = searchQuery, onValueChange = { searchQuery = it }, placeholder = { Text(tr["search"] ?: "Search...", color = t.text4) }, singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = t.accent.copy(alpha = 0.5f), unfocusedBorderColor = t.border.copy(alpha = 0.3f), cursorColor = t.accent, focusedTextColor = t.text, unfocusedTextColor = t.text, focusedContainerColor = t.bg2.copy(alpha = 0.5f), unfocusedContainerColor = t.bg2.copy(alpha = 0.5f)),
                        modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(24.dp))
                } else {
                    Text(tr["waxmes"] ?: "WaxMes", fontWeight = FontWeight.Bold, color = t.text)
                }
            }, actions = {
                if (isSearching) {
                    IconButton(onClick = { isSearching = false; searchQuery = "" }) { Icon(Icons.Default.Close, contentDescription = null, tint = t.text3) }
                } else {
                    if (repo.updateAvailable) {
                        IconButton(onClick = {
                            (ctx as? android.app.Activity)?.let {
                                it.startActivity(android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse("https://github.com/tarwaxur/WaxMes/releases/latest")).apply {
                                    addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
                                })
                            }
                        }) { BadgedBox(badge = { Badge(containerColor = Color(0xFF22c55e)) }) { Icon(Icons.Default.FileDownload, contentDescription = null, tint = Color(0xFF22c55e)) } }
                    }
                    IconButton(onClick = { isSearching = true }) { Icon(Icons.Default.Search, contentDescription = null, tint = t.text3) }
                    Box {
                        IconButton(onClick = { showMenu = true }) { Icon(Icons.Default.MoreVert, contentDescription = null, tint = t.text3) }
                        DropdownMenu(expanded = showMenu, onDismissRequest = { showMenu = false }, shape = RoundedCornerShape(20.dp), offset = DpOffset(0.dp, 4.dp), containerColor = t.bg2) {
                            DropdownMenuItem(text = { Text(tr["settings"] ?: "Settings", color = t.text) }, onClick = { showMenu = false; onSettingsClick() }, leadingIcon = { Icon(Icons.Default.Settings, contentDescription = null, tint = t.text3) })
                            DropdownMenuItem(text = { Text(tr["logout"] ?: "Logout", color = Color(0xFFef4444)) }, onClick = {
                                showMenu = false; repo.logout(); prefs.edit().clear().apply()
                                (ctx as? android.app.Activity)?.recreate()
                            }, leadingIcon = { Icon(Icons.Default.Logout, contentDescription = null, tint = Color(0xFFef4444)) })
                        }
                    }
                }
            })
        },
        bottomBar = {
            Surface(shape = RoundedCornerShape(28.dp), color = t.bg2.copy(alpha = 0.92f), shadowElevation = 8.dp,
                modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp, vertical = 8.dp).navigationBarsPadding()) {
                Row(modifier = Modifier.fillMaxWidth().padding(4.dp), horizontalArrangement = Arrangement.SpaceEvenly) {
                    Surface(shape = RoundedCornerShape(20.dp), color = if (selectedTab == "chats") t.accent.copy(alpha = 0.15f) else Color.Transparent,
                        modifier = Modifier.weight(1f)) {
                        Row(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)).clickable { selectedTab = "chats" }.padding(vertical = 10.dp), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.ChatBubble, contentDescription = null, tint = if (selectedTab == "chats") t.accent else t.text3, modifier = Modifier.size(20.dp))
                            Spacer(Modifier.width(4.dp))
                            Text(tr["chats"] ?: "Chats", color = if (selectedTab == "chats") t.accent else t.text3, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                        }
                    }
                    Surface(shape = RoundedCornerShape(20.dp), color = if (selectedTab == "new") t.accent.copy(alpha = 0.15f) else Color.Transparent,
                        modifier = Modifier.weight(1f)) {
                        Row(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)).clickable { selectedTab = "new" }.padding(vertical = 10.dp), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Add, contentDescription = null, tint = if (selectedTab == "new") t.accent else t.text3, modifier = Modifier.size(20.dp))
                            Spacer(Modifier.width(4.dp))
                            Text(tr["new"] ?: "New", color = if (selectedTab == "new") t.accent else t.text3, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                        }
                    }
                }
            }
        }
    ) { padding ->
        if (selectedTab == "chats") {
        PullToRefreshBox(isRefreshing = isRefreshing, onRefresh = doRefresh,
            modifier = Modifier.fillMaxSize().padding(padding).background(t.bg)) {
        LazyColumn(modifier = Modifier.fillMaxSize().navigationBarsPadding(), contentPadding = PaddingValues(vertical = 4.dp)) {
            items(displayConvs) { conv ->
                Row(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).combinedClickable(
                    onClick = { onChatClick(conv.id) },
                    onLongClick = { contextConv = conv }
                ).padding(horizontal = 12.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                    Box(modifier = Modifier.size(50.dp).clip(CircleShape).background(Color(if (conv.isGroup) 0xFF6366f1 else conv.color)), contentAlignment = Alignment.Center) {
                        if (!conv.isGroup) {
                            SubcomposeAsyncImage(model = conv.avatarUrl, contentDescription = null,
                                modifier = Modifier.fillMaxSize().clip(CircleShape), contentScale = ContentScale.Crop,
                                error = { Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { Text(conv.name.first().uppercase(), color = t.text, fontWeight = FontWeight.Bold, fontSize = 18.sp) } },
                                loading = { Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { Text(conv.name.first().uppercase(), color = t.text.copy(alpha = 0.5f), fontWeight = FontWeight.Bold, fontSize = 18.sp) } })
                        } else {
                            Text(tr["g"] ?: "G", color = t.text, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                        }
                    }
                    Spacer(Modifier.width(14.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            if (conv.isPinned) {
                                Icon(Icons.Default.PushPin, contentDescription = null, tint = t.accent.copy(alpha = 0.6f), modifier = Modifier.size(14.dp))
                                Spacer(Modifier.width(3.dp))
                            }
                            if (conv.isMuted) {
                                Icon(Icons.Default.VolumeOff, contentDescription = null, tint = t.text4, modifier = Modifier.size(14.dp))
                                Spacer(Modifier.width(3.dp))
                            }
                            if (conv.isGroup) {
                                Icon(Icons.Default.Groups, contentDescription = null, tint = t.text3, modifier = Modifier.size(14.dp))
                                Spacer(Modifier.width(3.dp))
                            }
                            Text(conv.name, color = t.text, fontWeight = FontWeight.SemiBold, fontSize = 15.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                            Spacer(Modifier.weight(1f))
                            if (!conv.isGroup) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Box(modifier = Modifier.size(6.dp).clip(CircleShape).background(if (conv.online) Color(0xFF22c55e) else t.text4))
                                    Spacer(Modifier.width(4.dp))
                                    Text(if (conv.online) (tr["online"] ?: "Online") else "", color = t.text4, fontSize = 10.sp)
                                }
                            }
                        }
                        Spacer(Modifier.height(2.dp))
                        Text(conv.lastMsg.ifEmpty { tr["no_messages"] ?: "No messages yet" }, color = t.text3, fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                    if (conv.unread > 0) {
                        Spacer(Modifier.width(8.dp))
                        Box(modifier = Modifier.size(22.dp).clip(CircleShape).background(Color(0xFFef4444)), contentAlignment = Alignment.Center) {
                            Text("${conv.unread}", color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
            if (displayConvs.isEmpty() && convs.isNotEmpty()) {
                item { Text(tr["no_match"] ?: "No conversations match", color = t.text4, modifier = Modifier.padding(20.dp).fillMaxWidth(), fontSize = 13.sp) }
            }
            if (convs.isEmpty()) {
                item { Text(tr["no_conversations"] ?: "No conversations yet", color = t.text4, modifier = Modifier.padding(40.dp).fillMaxWidth(), fontSize = 13.sp) }
            }
        }
        }
        } else {
        var newSearchQuery by remember { mutableStateOf("") }
        val filteredConvs = if (newSearchQuery.isBlank()) convs.filter { !it.isGroup && !it.isArchived }.sortedByDescending { it.online }
            else convs.filter { !it.isGroup && !it.isArchived && it.name.contains(newSearchQuery, ignoreCase = true) }.sortedByDescending { it.online }
        val filteredStories = if (newSearchQuery.isBlank()) storiesList.filter { it.authorId != repo.uid }
            else storiesList.filter { it.authorName.contains(newSearchQuery, ignoreCase = true) && it.authorId != repo.uid }
        PullToRefreshBox(isRefreshing = isRefreshing, onRefresh = doRefresh,
            modifier = Modifier.fillMaxSize().padding(padding).background(t.bg)) {
        LazyColumn(modifier = Modifier.fillMaxSize().navigationBarsPadding()) {
            item {
                OutlinedTextField(value = newSearchQuery, onValueChange = { newSearchQuery = it },
                    placeholder = { Text(tr["search_friends"] ?: "Search friends...", color = t.text4) }, singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = t.accent.copy(alpha = 0.5f), unfocusedBorderColor = t.border2.copy(alpha = 0.3f), cursorColor = t.accent, focusedTextColor = t.text, unfocusedTextColor = t.text, focusedContainerColor = t.bg2.copy(alpha = 0.5f), unfocusedContainerColor = t.bg2.copy(alpha = 0.5f)),
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp), shape = RoundedCornerShape(24.dp))
            }
            item {
                Text(tr["stories"] ?: "Stories", color = t.text4, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(start = 20.dp, top = 8.dp, bottom = 8.dp))
                Box(modifier = Modifier.fillMaxWidth().padding(horizontal = 14.dp)) {
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        item {
                            Surface(shape = RoundedCornerShape(8.dp), color = t.bg, shadowElevation = 4.dp) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.clickable {
                                    if (repo.ownStories.isNotEmpty()) { selectedStory = repo.ownStories.firstOrNull(); showStoryViewer = true }
                                }) {
                                    Box(modifier = Modifier.size(60.dp).background(if (repo.ownStories.isNotEmpty()) t.accent.copy(alpha = 0.15f) else t.accent.copy(alpha = 0.2f), CircleShape), contentAlignment = Alignment.Center) {
                                        if (repo.ownStories.isNotEmpty()) {
                                            Text(myNameInitial, color = t.text2, fontWeight = FontWeight.Bold, fontSize = 20.sp)
                                        } else {
                                            Icon(Icons.Default.Add, contentDescription = null, tint = t.accent, modifier = Modifier.size(22.dp))
                                        }
                                    }
                                    Text(if (repo.ownStories.isNotEmpty()) (tr["my_story"] ?: "My Story") else (tr["add_story"] ?: "Add Story"), color = t.text3, fontSize = 10.sp, maxLines = 1, modifier = Modifier.padding(top = 4.dp))
                                }
                            }
                        }
                        items(filteredStories) { story ->
                            Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.clip(RoundedCornerShape(8.dp)).clickable { selectedStory = story; showStoryViewer = true }) {
                                Box(modifier = Modifier.size(60.dp).background(Color(story.authorColor), CircleShape).padding(2.dp)) {
                                    SubcomposeAsyncImage(model = story.authorAvatar, contentDescription = null,
                                        modifier = Modifier.fillMaxSize().clip(CircleShape), contentScale = ContentScale.Crop,
                                        error = { Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { Text(story.authorName.first().uppercase(), color = t.text, fontWeight = FontWeight.Bold, fontSize = 18.sp) } },
                                        loading = { Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { Text(story.authorName.first().uppercase(), color = t.text.copy(alpha = 0.5f), fontWeight = FontWeight.Bold, fontSize = 18.sp) } })
                                }
                                Text(story.authorName, color = t.text3, fontSize = 10.sp, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(top = 4.dp))
                            }
                        }
                    }
                }
            }
            item {
                Spacer(Modifier.height(12.dp))
                Surface(shape = RoundedCornerShape(16.dp), color = t.accent.copy(alpha = 0.12f),
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp)) {
                    Row(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).clickable { showAddFriend = true }.padding(horizontal = 20.dp, vertical = 14.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.PersonAdd, contentDescription = null, tint = t.accent, modifier = Modifier.size(22.dp))
                        Spacer(Modifier.width(12.dp))
                        Text(tr["add_friend"] ?: "Add Friend", color = t.accent, fontSize = 15.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
                        Icon(Icons.Default.ChevronRight, contentDescription = null, tint = t.accent.copy(alpha = 0.5f), modifier = Modifier.size(20.dp))
                    }
                }
                Spacer(Modifier.height(12.dp))
                Text(tr["friends"] ?: "Friends", color = t.text4, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(start = 20.dp, bottom = 8.dp))
            }
            items(filteredConvs) { conv ->
                Row(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).clickable { onChatClick(conv.id) }.padding(horizontal = 16.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                    Box(modifier = Modifier.size(44.dp).clip(CircleShape).background(Color(conv.color))) {
                        SubcomposeAsyncImage(model = conv.avatarUrl, contentDescription = null,
                            modifier = Modifier.fillMaxSize().clip(CircleShape), contentScale = ContentScale.Crop,
                            error = { Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { Text(conv.name.first().uppercase(), color = t.text, fontWeight = FontWeight.Bold, fontSize = 16.sp) } },
                            loading = { Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { Text(conv.name.first().uppercase(), color = t.text.copy(alpha = 0.5f), fontWeight = FontWeight.Bold, fontSize = 16.sp) } })
                    }
                    Spacer(Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(conv.name, color = t.text, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                        Text(if (conv.online) (tr["online"] ?: "Online") else (tr["offline"] ?: "Offline"), color = t.text3, fontSize = 11.sp)
                    }
                    Icon(Icons.Default.ChevronRight, contentDescription = null, tint = t.text4, modifier = Modifier.size(18.dp))
                }
            }
            item { Spacer(Modifier.height(80.dp)) }
        }
        }
    }
    }

    if (showStoryViewer) {
        val story = selectedStory
        if (story != null) {
            val bg = try { Color(android.graphics.Color.parseColor(story.bgColor)) } catch (e: Exception) { Color(0xFF818cf8) }
            AlertDialog(onDismissRequest = { showStoryViewer = false; selectedStory = null },
                containerColor = bg, shape = RoundedCornerShape(24.dp),
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                        if (story.authorId == repo.uid) {
                            IconButton(onClick = { repo.deleteStory(story.id); showStoryViewer = false; selectedStory = null }) {
                                Icon(Icons.Default.Delete, contentDescription = null, tint = Color.White.copy(alpha = 0.7f))
                            }
                        }
                        Spacer(Modifier.weight(1f))
                        Text(story.authorName, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                        Spacer(Modifier.weight(1f))
                        IconButton(onClick = { repo.viewStory(story.id); showStoryViewer = false; selectedStory = null }) {
                            Icon(Icons.Default.Close, contentDescription = null, tint = Color.White.copy(alpha = 0.7f))
                        }
                    }
                },
                text = {
                    Box(modifier = Modifier.fillMaxWidth().height(350.dp), contentAlignment = Alignment.Center) {
                        if (story.mediaUrl.isNotEmpty()) {
                            SubcomposeAsyncImage(model = story.mediaUrl, contentDescription = null,
                                modifier = Modifier.fillMaxSize().clip(RoundedCornerShape(16.dp)), contentScale = ContentScale.Fit,
                                error = { Text(story.text.ifEmpty { story.caption }, color = Color.White, fontSize = 20.sp, textAlign = androidx.compose.ui.text.style.TextAlign.Center) },
                                loading = { Text(story.text.ifEmpty { story.caption }, color = Color.White.copy(alpha = 0.7f), fontSize = 20.sp, textAlign = androidx.compose.ui.text.style.TextAlign.Center) })
                        } else if (story.text.isNotEmpty()) {
                            Text(story.text, color = Color.White, fontSize = 22.sp, textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                                modifier = Modifier.padding(24.dp))
                        }
                    }
                },
                confirmButton = { TextButton(onClick = { repo.viewStory(story.id); showStoryViewer = false; selectedStory = null }) {
                    Text(tr["close"] ?: "Close", color = Color.White.copy(alpha = 0.7f))
                } })
        } else {
            AlertDialog(onDismissRequest = { showStoryViewer = false }, containerColor = t.bg, shape = RoundedCornerShape(24.dp),
                title = { Text(tr["my_story"] ?: "My Story", color = t.text, fontWeight = FontWeight.Bold) },
                text = {
                    Box(modifier = Modifier.fillMaxWidth().height(300.dp).background(t.bg2, RoundedCornerShape(16.dp)), contentAlignment = Alignment.Center) {
                        Text(tr["your_story_here"] ?: "Your story will appear here", color = t.text3, fontSize = 14.sp)
                    }
                },
                confirmButton = { TextButton(onClick = { showStoryViewer = false }) { Text(tr["close"] ?: "Close", color = t.accent) } })
        }
    }

    if (showAddFriend) {
        AddFriendScreen(t, onBack = { showAddFriend = false })
    }

    if (contextConv != null) {
        val conv = contextConv!!
        ModalBottomSheet(
            containerColor = t.bg2,
            onDismissRequest = { contextConv = null },
            shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)
        ) {
            Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp).padding(bottom = 32.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth().padding(bottom = 20.dp)) {
                    Box(modifier = Modifier.size(48.dp).clip(CircleShape).background(Color(if (conv.isGroup) 0xFF6366f1 else conv.color)), contentAlignment = Alignment.Center) {
                        if (!conv.isGroup) {
                                    SubcomposeAsyncImage(model = conv.avatarUrl, contentDescription = null,
                                        modifier = Modifier.fillMaxSize().clip(CircleShape), contentScale = ContentScale.Crop,
                                        error = { Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { Text(conv.name.first().uppercase(), color = t.text, fontWeight = FontWeight.Bold, fontSize = 18.sp) } },
                                        loading = { Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { Text(conv.name.first().uppercase(), color = t.text.copy(alpha = 0.5f), fontWeight = FontWeight.Bold, fontSize = 18.sp) } })
                                }
                                Text(conv.name, color = t.text3, fontSize = 10.sp, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(top = 4.dp).width(60.dp))
                            }
                        }
                    }
                    Spacer(Modifier.width(14.dp))
                    Column {
                        Text(conv.name, color = t.text, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                        if (!conv.isGroup) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(modifier = Modifier.size(7.dp).clip(CircleShape).background(if (conv.online) Color(0xFF22c55e) else t.text4))
                                Spacer(Modifier.width(5.dp))
                                Text(if (conv.online) (tr["online"] ?: "Online") else (tr["offline"] ?: "Offline"), color = t.text3, fontSize = 12.sp)
                            }
                        } else {
                            Text(tr["group"] ?: "Group", color = t.text3, fontSize = 12.sp)
                        }
                    }
                }
                Text(tr["conversation_actions"] ?: "Conversation Actions", color = t.text4, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(bottom = 8.dp))
                ContextMenuItem(icon = if (conv.isMuted) Icons.Default.Notifications else Icons.Default.VolumeOff,
                    label = if (conv.isMuted) (tr["unmute"] ?: "Unmute") else (tr["mute"] ?: "Mute"), desc = if (conv.isMuted) (tr["receive_notif"] ?: "Receive notifications") else (tr["silence_notif"] ?: "Silence notifications"),
                    tint = t.text, onClick = {
                        val muted = !conv.isMuted; prefs.edit().putBoolean("mute_${conv.id}", muted).apply()
                        convs = convs.toMutableList().also { it.find { it.id == conv.id }?.isMuted = muted }; contextConv = null
                    })
                ContextMenuItem(icon = Icons.Default.PushPin,
                    label = if (conv.isPinned) (tr["unpin"] ?: "Unpin") else (tr["pin"] ?: "Pin"), desc = if (conv.isPinned) (tr["remove_top"] ?: "Remove from top") else (tr["keep_top"] ?: "Keep at top"),
                    tint = t.text, onClick = {
                        val pinned = !conv.isPinned; prefs.edit().putBoolean("pin_${conv.id}", pinned).apply()
                        convs = convs.toMutableList().also { it.find { it.id == conv.id }?.isPinned = pinned }; contextConv = null
                    })
                ContextMenuItem(icon = if (conv.isArchived) Icons.Default.Unarchive else Icons.Default.Archive,
                    label = if (conv.isArchived) (tr["unarchive"] ?: "Unarchive") else (tr["archive"] ?: "Archive"), desc = if (conv.isArchived) (tr["show_list"] ?: "Show in chat list") else (tr["hide_list"] ?: "Hide from chat list"),
                    tint = t.text, onClick = {
                        val archived = !conv.isArchived; prefs.edit().putBoolean("arch_${conv.id}", archived).apply()
                        convs = convs.toMutableList().also { it.find { it.id == conv.id }?.isArchived = archived }; contextConv = null
                    })
                ContextMenuItem(icon = Icons.Default.Delete, label = tr["clear_chat"] ?: "Clear Chat", desc = tr["delete_all"] ?: "Delete all messages",
                    tint = Color(0xFFef4444), onClick = {
                        repo.clearMessages(conv.id)
                        convs = convs.toMutableList().also { it.removeAll { c -> c.id == conv.id } }; contextConv = null
                    })
                Spacer(Modifier.height(8.dp))
                TextButton(onClick = { contextConv = null }, modifier = Modifier.fillMaxWidth()) {
                    Text(tr["cancel"] ?: "Cancel", color = t.accent, fontWeight = FontWeight.SemiBold)
                }
            }
        }
@Composable
private fun ContextMenuItem(icon: ImageVector, label: String, desc: String, tint: Color, onClick: () -> Unit) {
    val ct = LocalTheme.current
    val tr = LocalTranslations.current
    Surface(shape = RoundedCornerShape(12.dp), color = ct.bg3,
        modifier = Modifier.fillMaxWidth().padding(vertical = 3.dp)) {
        Row(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).clickable { onClick() }.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, contentDescription = null, tint = tint, modifier = Modifier.size(22.dp))
            Spacer(Modifier.width(14.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(label, color = tint, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                Text(desc, color = ct.text4, fontSize = 11.sp)
            }
            Icon(Icons.Default.ChevronRight, contentDescription = null, tint = ct.text4, modifier = Modifier.size(18.dp))
        }
    }
}

@Composable
private fun AddFriendScreen(t: ThemeColors, onBack: () -> Unit) {
    val tr = LocalTranslations.current
    var page by remember { mutableStateOf("add") }
    Box(modifier = Modifier.fillMaxSize().background(t.bg)) {
        Column(modifier = Modifier.fillMaxSize().padding(start = 20.dp, end = 20.dp, top = 8.dp, bottom = 8.dp).navigationBarsPadding()) {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp)) {
                IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null, tint = t.text) }
                Spacer(Modifier.width(8.dp))
                Text(tr["add_friend"] ?: "Add Friend", color = t.text, fontSize = 20.sp, fontWeight = FontWeight.Bold)
            }
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Surface(shape = RoundedCornerShape(12.dp), color = if (page == "add") t.accent.copy(alpha = 0.15f) else t.bg3,
                    modifier = Modifier.weight(1f)) {
                    Box(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).clickable { page = "add" }) {
                        Text(tr["add_friend"] ?: "Add Friend", color = if (page == "add") t.accent else t.text3, fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.padding(12.dp), fontSize = 13.sp)
                    }
                }
                Surface(shape = RoundedCornerShape(12.dp), color = if (page == "pending") t.accent.copy(alpha = 0.15f) else t.bg3,
                    modifier = Modifier.weight(1f)) {
                    Box(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).clickable { page = "pending" }) {
                        Text(tr["pending"] ?: "Pending", color = if (page == "pending") t.accent else t.text3, fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.padding(12.dp), fontSize = 13.sp)
                    }
                }
            }
            Spacer(Modifier.height(20.dp))
            if (page == "add") {
                OutlinedTextField(value = "", onValueChange = {}, placeholder = { Text(tr["search_by_username"] ?: "Search by username...", color = t.text4) },
                    modifier = Modifier.fillMaxWidth(), singleLine = true, shape = RoundedCornerShape(24.dp),
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = t.accent.copy(alpha = 0.5f), unfocusedBorderColor = t.border2.copy(alpha = 0.3f), cursorColor = t.accent, focusedTextColor = t.text, unfocusedTextColor = t.text, focusedContainerColor = t.bg2.copy(alpha = 0.5f), unfocusedContainerColor = t.bg2.copy(alpha = 0.5f)))
                Spacer(Modifier.height(16.dp))
                Text(tr["search_info"] ?: "Search for users by their username to send a friend request.", color = t.text4, fontSize = 13.sp)
            } else {
                Text(tr["no_pending"] ?: "No pending requests", color = t.text4, fontSize = 14.sp)
            }
        }
    }
}