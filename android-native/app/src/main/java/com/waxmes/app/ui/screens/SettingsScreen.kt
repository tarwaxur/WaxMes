package com.waxmes.app.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.*
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.border
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.AnnotatedString
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import com.waxmes.app.data.Repository
import com.waxmes.app.data.appLog
import com.waxmes.app.data.appLogs
import com.waxmes.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(repo: Repository, currentTheme: String, onThemeChange: (String) -> Unit, onLogout: () -> Unit, onBack: () -> Unit) {
    val t = LocalTheme.current
    var selectedCategory by remember { mutableStateOf("profile") }
    var themeView by remember { mutableStateOf<String?>(null) }
    val drawerState = rememberDrawerState(DrawerValue.Closed)

    val scope = rememberCoroutineScope()

    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            ModalDrawerSheet(drawerContainerColor = t.bg2, drawerContentColor = t.text) {
                Spacer(Modifier.height(24.dp))
                Text("Menu", color = t.text4, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(horizontal = 24.dp, vertical = 8.dp))
                DrawerItem(icon = Icons.Default.Person, label = "Profile", selected = selectedCategory == "profile", t = t) { scope.launch { drawerState.close() }; selectedCategory = "profile"; themeView = null }
                DrawerItem(icon = Icons.Default.Palette, label = "Themes", selected = selectedCategory == "themes", t = t) { scope.launch { drawerState.close() }; selectedCategory = "themes"; themeView = null }
                DrawerItem(icon = Icons.Default.BugReport, label = "Debug", selected = selectedCategory == "debug", t = t) { scope.launch { drawerState.close() }; selectedCategory = "debug"; themeView = null }
                DrawerItem(icon = Icons.Default.Info, label = "About", selected = selectedCategory == "about", t = t) { scope.launch { drawerState.close() }; selectedCategory = "about"; themeView = null }
                Spacer(Modifier.weight(1f))
                Text("WaxMes v0.1.0", color = t.text4, fontSize = 11.sp, modifier = Modifier.padding(24.dp))
            }
        }
    ) {
        Scaffold(
            containerColor = t.bg,
            topBar = {
                TopAppBar(title = { Text("Settings", color = t.text, fontWeight = FontWeight.SemiBold) },
                    navigationIcon = {
                        if (themeView != null) {
                            IconButton(onClick = { themeView = null }) { Icon(Icons.Default.ArrowDropDown, contentDescription = null, tint = t.text) }
                        } else {
                            IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null, tint = t.text) }
                        }
                    },
                    actions = {
                        IconButton(onClick = { scope.launch { drawerState.open() } }) {
                            Icon(Icons.Default.Menu, contentDescription = null, tint = t.text)
                        }
                    })
            }
        ) { padding ->
            Box(modifier = Modifier.fillMaxSize().padding(padding).background(t.bg)) {
                when {
                    themeView != null -> ThemePreview(themeView!!, currentTheme, onThemeChange)
                    selectedCategory == "profile" -> ProfileSection(t, repo)
                    selectedCategory == "themes" -> ThemesPage(t, currentTheme, onThemeChange, onSelectCategory = { themeView = it })
                    selectedCategory == "debug" -> DebugSection(t)
                    selectedCategory == "about" -> AboutSection(t, onLogout)
                }
            }
        }
    }
}

@Composable
private fun DrawerItem(icon: ImageVector, label: String, selected: Boolean, t: ThemeColors, onClick: () -> Unit) {
    Surface(color = if (selected) t.accent.copy(alpha = 0.12f) else Color.Transparent,
        shape = RoundedCornerShape(12.dp),
        modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 2.dp).clickable { onClick() }) {
        Row(modifier = Modifier.padding(horizontal = 14.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, contentDescription = null, tint = if (selected) t.accent else t.text2, modifier = Modifier.size(22.dp))
            Spacer(Modifier.width(14.dp))
            Text(label, color = if (selected) t.accent else t.text, fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal, fontSize = 15.sp)
        }
    }
}

@Composable
fun ProfileSection(t: ThemeColors, repo: Repository) {
    var name by remember { mutableStateOf("") }
    var avatarUrl by remember { mutableStateOf("") }
    LaunchedEffect(Unit) {
        if (repo.uid.isNotEmpty()) {
            repo.fetchUserStatus(repo.uid) { displayName, _, avatar ->
                name = displayName; avatarUrl = avatar; appLog("Profile loaded: $name")
            }
        }
    }
    val scrollState = rememberScrollState()
    Column(modifier = Modifier.fillMaxSize().padding(24.dp).verticalScroll(scrollState).navigationBarsPadding(), horizontalAlignment = Alignment.CenterHorizontally) {
        Spacer(Modifier.height(20.dp))
        Box(modifier = Modifier.size(84.dp).clip(CircleShape).background(t.bg3), contentAlignment = Alignment.Center) {
            if (avatarUrl.isNotEmpty()) {
                coil.compose.AsyncImage(model = avatarUrl, contentDescription = null,
                    modifier = Modifier.fillMaxSize().clip(CircleShape), contentScale = androidx.compose.ui.layout.ContentScale.Crop)
            } else {
                Text(if (name.isNotEmpty()) name.first().uppercase() else "?", fontSize = 32.sp, fontWeight = FontWeight.Bold, color = t.text2)
            }
        }
        Spacer(Modifier.height(16.dp))
        Text(name.ifEmpty { "Loading..." }, color = t.text, fontSize = 22.sp, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(4.dp))
        Text(repo.auth.currentUser?.email ?: "", color = t.text3, fontSize = 14.sp)
        Spacer(Modifier.height(32.dp))
        Surface(shape = RoundedCornerShape(16.dp), color = t.bg3, modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(20.dp)) {
                Text("Account Info", color = t.text4, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                Spacer(Modifier.height(12.dp))
                ProfileRow("User ID", repo.uid.take(16) + "...", t)
                ProfileRow("Display Name", name, t)
                ProfileRow("Email", repo.auth.currentUser?.email ?: "", t)
            }
        }
    }
}

@Composable
private fun ProfileRow(label: String, value: String, t: ThemeColors) {
    Row(modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp)) {
        Text(label, color = t.text3, fontSize = 13.sp, modifier = Modifier.width(100.dp))
        Text(value, color = t.text, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
fun ThemesPage(t: ThemeColors, currentTheme: String, onThemeChange: (String) -> Unit, onSelectCategory: (String) -> Unit) {
    Column(modifier = Modifier.fillMaxSize().padding(20.dp).navigationBarsPadding()) {
        Text("Themes", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = t.text)
        Spacer(Modifier.height(8.dp))
        Text("Choose a category to preview and apply themes", color = t.text3, fontSize = 13.sp)
        Spacer(Modifier.height(24.dp))

        // Dark themes card
        ThemeCategoryCard(
            label = "Dark Themes",
            count = allThemes.count { !it.value.isLight },
            previewColor = Color(0xFF0b101f),
            accentColor = Color(0xFF818cf8),
            t = t,
            onClick = { onSelectCategory("dark") }
        )
        Spacer(Modifier.height(16.dp))

        // Light themes card
        ThemeCategoryCard(
            label = "Light Themes",
            count = allThemes.count { it.value.isLight },
            previewColor = Color(0xFFece8e0),
            accentColor = Color(0xFF6366f1),
            t = t,
            onClick = { onSelectCategory("light") }
        )

        Spacer(Modifier.height(24.dp))
        Text("Current: ${currentTheme.replaceFirstChar { it.uppercase() }}", color = t.text4, fontSize = 12.sp)
    }
}

@Composable
private fun ThemeCategoryCard(label: String, count: Int, previewColor: Color, accentColor: Color, t: ThemeColors, onClick: () -> Unit) {
    Surface(shape = RoundedCornerShape(20.dp), color = t.bg3,
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
        tonalElevation = 2.dp) {
        Row(modifier = Modifier.padding(20.dp), verticalAlignment = Alignment.CenterVertically) {
            // Phone preview mockup
            Box(modifier = Modifier.size(70.dp, 120.dp).clip(RoundedCornerShape(12.dp)).background(previewColor), contentAlignment = Alignment.TopCenter) {
                Box(modifier = Modifier.fillMaxWidth().height(14.dp).background(accentColor.copy(alpha = 0.3f)))
                Column(modifier = Modifier.padding(top = 20.dp, start = 6.dp, end = 6.dp)) {
                    Box(modifier = Modifier.fillMaxWidth().height(4.dp).background(accentColor.copy(alpha = 0.5f)))
                    Spacer(Modifier.height(4.dp))
                    Box(modifier = Modifier.fillMaxWidth(0.7f).height(4.dp).background(accentColor.copy(alpha = 0.3f)))
                    Spacer(Modifier.height(8.dp))
                    repeat(3) {
                        Box(modifier = Modifier.fillMaxWidth().height(3.dp).background(Color.White.copy(alpha = 0.15f)))
                        Spacer(Modifier.height(4.dp))
                    }
                }
            }
            Spacer(Modifier.width(20.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(label, color = t.text, fontSize = 20.sp, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(2.dp))
                Text("$count themes available", color = t.text3, fontSize = 13.sp)
                Spacer(Modifier.height(8.dp))
                Row {
                    Box(modifier = Modifier.size(10.dp).clip(CircleShape).background(accentColor))
                    Spacer(Modifier.width(6.dp))
                    Box(modifier = Modifier.size(10.dp).clip(CircleShape).background(accentColor.copy(alpha = 0.6f)))
                    Spacer(Modifier.width(6.dp))
                    Box(modifier = Modifier.size(10.dp).clip(CircleShape).background(accentColor.copy(alpha = 0.3f)))
                }
            }
            Icon(Icons.Default.ChevronRight, contentDescription = null, tint = t.text4, modifier = Modifier.size(24.dp))
        }
    }
}

@Composable
fun ThemePreview(category: String, currentTheme: String, onThemeChange: (String) -> Unit) {
    val t = LocalTheme.current
    val themes = allThemes.filter { if (category == "dark") !it.value.isLight else it.value.isLight }
    var selectedTheme by remember { mutableStateOf(currentTheme) }

    Column(modifier = Modifier.fillMaxSize().padding(20.dp).navigationBarsPadding()) {
        Text(if (category == "dark") "Dark Themes" else "Light Themes",
            fontSize = 22.sp, fontWeight = FontWeight.Bold, color = t.text)
        Spacer(Modifier.height(16.dp))

        // Phone preview
        val previewTheme = allThemes[selectedTheme] ?: t
        Box(modifier = Modifier.fillMaxWidth().height(240.dp).clip(RoundedCornerShape(20.dp)).background(previewTheme.bg),
            contentAlignment = Alignment.Center) {
            // Simplified phone UI preview
            Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
                // Status bar
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("9:41", color = previewTheme.text2, fontSize = 11.sp)
                    Row {
                        Box(modifier = Modifier.size(6.dp).clip(CircleShape).background(previewTheme.text3))
                        Spacer(Modifier.width(3.dp))
                        Box(modifier = Modifier.size(6.dp).clip(CircleShape).background(previewTheme.text3))
                        Spacer(Modifier.width(3.dp))
                        Box(modifier = Modifier.size(6.dp).clip(CircleShape).background(previewTheme.text3))
                    }
                }
                Spacer(Modifier.height(8.dp))
                // App bar
                Row(modifier = Modifier.fillMaxWidth().background(previewTheme.bg2).padding(8.dp)) {
                    Box(modifier = Modifier.size(24.dp).clip(CircleShape).background(previewTheme.bg3))
                    Spacer(Modifier.width(8.dp))
                    Column(Modifier.weight(1f)) {
                        Box(modifier = Modifier.fillMaxWidth(0.5f).height(8.dp).background(previewTheme.text2.copy(alpha = 0.3f)))
                        Spacer(Modifier.height(3.dp))
                        Box(modifier = Modifier.fillMaxWidth(0.3f).height(5.dp).background(previewTheme.text3.copy(alpha = 0.2f)))
                    }
                    Box(modifier = Modifier.size(20.dp).clip(CircleShape).background(previewTheme.accent))
                }
                Spacer(Modifier.height(8.dp))
                // Message bubbles
                Box(modifier = Modifier.fillMaxWidth(0.7f).height(28.dp).background(previewTheme.msgReceived, RoundedCornerShape(8.dp)))
                Spacer(Modifier.height(6.dp))
                Box(modifier = Modifier.fillMaxWidth(0.6f).align(Alignment.End).height(28.dp).background(previewTheme.accent.copy(alpha = 0.15f), RoundedCornerShape(8.dp)))
                Spacer(Modifier.height(6.dp))
                Box(modifier = Modifier.fillMaxWidth(0.5f).height(28.dp).background(previewTheme.msgReceived, RoundedCornerShape(8.dp)))
                Spacer(Modifier.weight(1f))
                // Input bar
                Row(modifier = Modifier.fillMaxWidth().background(previewTheme.inputBg).padding(6.dp)) {
                    Box(modifier = Modifier.weight(1f).height(28.dp).background(previewTheme.bg2, RoundedCornerShape(8.dp)))
                    Spacer(Modifier.width(6.dp))
                    Box(modifier = Modifier.size(28.dp).clip(CircleShape).background(previewTheme.accent))
                }
            }
        }
        Spacer(Modifier.height(20.dp))

        // Color swatches
        Text("Select Theme", color = t.text4, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(bottom = 10.dp))
        LazyVerticalGrid(columns = GridCells.Fixed(2), modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp), verticalArrangement = Arrangement.spacedBy(10.dp),
            contentPadding = PaddingValues(bottom = 80.dp)) {
            items(themes.toList()) { (name, theme) ->
                val isSelected = name == selectedTheme
                Surface(shape = RoundedCornerShape(14.dp), color = t.bg3,
                    border = if (isSelected) androidx.compose.foundation.BorderStroke(2.dp, t.accent) else null,
                    modifier = Modifier.fillMaxWidth().clickable {
                        selectedTheme = name; onThemeChange(name); appLog("Theme changed: $name")
                    }) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(modifier = Modifier.size(26.dp).clip(RoundedCornerShape(6.dp)).background(theme.accent))
                            Spacer(Modifier.width(10.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(name.replaceFirstChar { it.uppercase() }, color = t.text, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                                Text(if (theme.isLight) "Light" else "Dark", color = t.text4, fontSize = 10.sp)
                            }
                            if (isSelected) Icon(Icons.Default.Check, contentDescription = null, tint = t.accent, modifier = Modifier.size(16.dp))
                        }
                        Spacer(Modifier.height(8.dp))
                        Row {
                            Box(modifier = Modifier.size(12.dp).clip(CircleShape).background(theme.bg))
                            Spacer(Modifier.width(4.dp))
                            Box(modifier = Modifier.size(12.dp).clip(CircleShape).background(theme.bg2))
                            Spacer(Modifier.width(4.dp))
                            Box(modifier = Modifier.size(12.dp).clip(CircleShape).background(theme.bg3))
                            Spacer(Modifier.width(4.dp))
                            Box(modifier = Modifier.size(12.dp).clip(CircleShape).background(theme.accent))
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun DebugSection(t: ThemeColors) {
    val listState = rememberLazyListState()
    var logs by remember { mutableStateOf(appLogs.toList()) }
    val clipboard = LocalClipboardManager.current
    var showCopied by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        while (true) {
            kotlinx.coroutines.delay(1000)
            logs = appLogs.toList()
            if (logs.isNotEmpty()) listState.animateScrollToItem(logs.size - 1)
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        Column(modifier = Modifier.fillMaxSize().padding(20.dp).navigationBarsPadding()) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text("Console", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = t.text)
                Row {
                    if (logs.isNotEmpty()) {
                        TextButton(onClick = {
                            clipboard.setText(AnnotatedString(logs.joinToString("\n")))
                            showCopied = true
                        }) { Text("Copy", color = t.accent, fontSize = 12.sp) }
                    }
                    TextButton(onClick = { appLogs.clear(); logs = emptyList() }) { Text("Clear", color = t.accent, fontSize = 12.sp) }
                }
            }
            Spacer(Modifier.height(12.dp))
            Surface(shape = RoundedCornerShape(12.dp), color = t.bg3,
                modifier = Modifier.fillMaxSize().clickable {
                    if (logs.isNotEmpty()) {
                        clipboard.setText(AnnotatedString(logs.joinToString("\n")))
                        showCopied = true
                    }
                }) {
                if (logs.isEmpty()) {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text("No logs yet", color = t.text4, fontSize = 13.sp)
                    }
                } else {
                    LazyColumn(state = listState, modifier = Modifier.fillMaxSize().padding(10.dp)) {
                        items(logs) { log ->
                            Text(log, color = t.text3, fontSize = 10.sp, fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace, lineHeight = 15.sp)
                        }
                    }
                }
            }
        }

        // Toast notification
        AnimatedVisibility(visible = showCopied, enter = slideInVertically { it }, exit = slideOutVertically { it }) {
            Box(modifier = Modifier.fillMaxWidth().padding(horizontal = 40.dp).padding(bottom = 24.dp).align(Alignment.BottomCenter)) {
                Surface(shape = RoundedCornerShape(50),
                    color = t.text.copy(alpha = 0.85f),
                    shadowElevation = 6.dp) {
                    Text("Copied to clipboard", color = t.bg, fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.padding(horizontal = 28.dp, vertical = 14.dp))
                }
            }
        }
    }

    LaunchedEffect(showCopied) {
        if (showCopied) { delay(2000); showCopied = false }
    }
}

@Composable
fun AboutSection(t: ThemeColors, onLogout: () -> Unit) {
    Column(modifier = Modifier.fillMaxSize().padding(24.dp).navigationBarsPadding(), horizontalAlignment = Alignment.CenterHorizontally) {
        Spacer(Modifier.height(32.dp))
        Box(modifier = Modifier.size(80.dp).clip(RoundedCornerShape(20.dp)).background(t.accent), contentAlignment = Alignment.Center) {
            Text("W", fontSize = 36.sp, fontWeight = FontWeight.Bold, color = Color.White)
        }
        Spacer(Modifier.height(16.dp))
        Text("WaxMes", fontSize = 26.sp, fontWeight = FontWeight.Bold, color = t.text)
        Text("v0.1.0", color = t.text4, fontSize = 14.sp)
        Spacer(Modifier.height(32.dp))
        Surface(shape = RoundedCornerShape(16.dp), color = t.bg3, modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(20.dp)) {
                AboutRow("Version", "0.1.0", t)
                AboutRow("Platform", "Android Native", t)
                AboutRow("Framework", "Jetpack Compose", t)
                AboutRow("Architecture", "MVVM + Firebase", t)
            }
        }
        Spacer(Modifier.height(24.dp))
        Text("\u00A9 2026 Waxur", color = t.text4, fontSize = 13.sp)
        Spacer(Modifier.weight(1f))
        Button(onClick = onLogout,
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFef4444)),
            modifier = Modifier.fillMaxWidth().height(52.dp),
            shape = RoundedCornerShape(14.dp)) {
            Icon(Icons.Default.Logout, contentDescription = null, tint = Color.White, modifier = Modifier.size(20.dp))
            Spacer(Modifier.width(8.dp))
            Text("Logout", color = Color.White, fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
        }
        Spacer(Modifier.height(16.dp))
    }
}

@Composable
private fun AboutRow(label: String, value: String, t: ThemeColors) {
    Row(modifier = Modifier.fillMaxWidth().padding(vertical = 5.dp)) {
        Text(label, color = t.text3, fontSize = 13.sp, modifier = Modifier.width(110.dp))
        Text(value, color = t.text, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
    }
}