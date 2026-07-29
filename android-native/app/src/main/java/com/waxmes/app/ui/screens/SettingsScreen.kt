package com.waxmes.app.ui.screens

import androidx.activity.compose.BackHandler
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
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.border
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import kotlinx.coroutines.delay
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import com.waxmes.app.data.LocalLangCode
import com.waxmes.app.data.LocalTranslations
import com.waxmes.app.data.Repository
import com.waxmes.app.data.appLog
import com.waxmes.app.data.appLogs
import com.waxmes.app.data.detectSystemLanguage
import com.waxmes.app.data.getLangByCode
import com.waxmes.app.data.getLanguages
import com.waxmes.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(repo: Repository, currentTheme: String, onThemeChange: (String) -> Unit, onLogout: () -> Unit, onBack: () -> Unit, onLanguageChange: (String) -> Unit = {}, onUseDeviceLang: () -> Unit = {}) {
    val t = LocalTheme.current
    val tr = LocalTranslations.current
    var selectedCategory by remember { mutableStateOf("profile") }
    var themeView by remember { mutableStateOf<String?>(null) }
    val drawerState = rememberDrawerState(DrawerValue.Closed)

    val scope = rememberCoroutineScope()

    BackHandler(enabled = themeView != null) { themeView = null }
    BackHandler(enabled = selectedCategory != "profile" && themeView == null) { selectedCategory = "profile" }

    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            ModalDrawerSheet(drawerContainerColor = t.bg2, drawerContentColor = t.text) {
                Spacer(Modifier.height(24.dp))
                Text(tr["menu"] ?: "Menu", color = t.text4, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(horizontal = 24.dp, vertical = 8.dp))
                DrawerItem(icon = Icons.Default.Person, label = tr["profile"] ?: "Profile", selected = selectedCategory == "profile", t = t) { scope.launch { drawerState.close() }; selectedCategory = "profile"; themeView = null }
                DrawerItem(icon = Icons.Default.Palette, label = tr["themes"] ?: "Themes", selected = selectedCategory == "themes", t = t) { scope.launch { drawerState.close() }; selectedCategory = "themes"; themeView = null }
                DrawerItem(icon = Icons.Default.Language, label = tr["language"] ?: "Language", selected = selectedCategory == "language", t = t) { scope.launch { drawerState.close() }; selectedCategory = "language"; themeView = null }
                DrawerItem(icon = Icons.Default.BugReport, label = tr["debug"] ?: "Debug", selected = selectedCategory == "debug", t = t) { scope.launch { drawerState.close() }; selectedCategory = "debug"; themeView = null }
                DrawerItem(icon = Icons.Default.Info, label = tr["about"] ?: "About", selected = selectedCategory == "about", t = t) { scope.launch { drawerState.close() }; selectedCategory = "about"; themeView = null }
                Spacer(Modifier.weight(1f))
                Text("${tr["waxmes"] ?: "WaxMes"} v0.1.0", color = t.text4, fontSize = 11.sp, modifier = Modifier.padding(24.dp))
            }
        }
    ) {
        Scaffold(
            containerColor = t.bg,
            topBar = {
                TopAppBar(title = { Text(tr["settings"] ?: "Settings", color = t.text, fontWeight = FontWeight.SemiBold) },
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
                    selectedCategory == "language" -> LanguageSection(t, onLanguageChange, onUseDeviceLang)
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
        modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 2.dp)) {
        Row(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).clickable { onClick() }.padding(horizontal = 14.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, contentDescription = null, tint = if (selected) t.accent else t.text2, modifier = Modifier.size(22.dp))
            Spacer(Modifier.width(14.dp))
            Text(label, color = if (selected) t.accent else t.text, fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal, fontSize = 15.sp)
        }
    }
}

@Composable
fun ProfileSection(t: ThemeColors, repo: Repository) {
    val tr = LocalTranslations.current
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
        Text(name.ifEmpty { tr["loading"] ?: "Loading..." }, color = t.text, fontSize = 22.sp, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(4.dp))
        Text(repo.auth.currentUser?.email ?: "", color = t.text3, fontSize = 14.sp)
        Spacer(Modifier.height(32.dp))
        Surface(shape = RoundedCornerShape(16.dp), color = t.bg3, modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(20.dp)) {
                Text(tr["account_info"] ?: "Account Info", color = t.text4, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                Spacer(Modifier.height(12.dp))
                ProfileRow(tr["user_id"] ?: "User ID", repo.uid.take(16) + "...", t)
                ProfileRow(tr["display_name"] ?: "Display Name", name, t)
                ProfileRow(tr["email"] ?: "Email", repo.auth.currentUser?.email ?: "", t)
            }
        }
        Spacer(Modifier.height(20.dp))
        var updateStatus by remember { mutableStateOf("") }
        var updateVer by remember { mutableStateOf("") }
        val ctx = LocalContext.current
        LaunchedEffect(Unit) { repo.checkForUpdate { avail, ver -> updateStatus = if (avail) "update" else "latest"; updateVer = ver } }
        Surface(shape = RoundedCornerShape(16.dp), color = t.bg3, modifier = Modifier.fillMaxWidth()) {
            Row(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).clickable {
                if (updateStatus == "update") {
                    ctx.startActivity(android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse("https://github.com/tarwaxur/WaxMes/releases/latest")).apply {
                        addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
                    })
                } else {
                    updateStatus = "checking"
                    repo.checkForUpdate { avail, ver ->
                        updateStatus = if (avail) "update" else "latest"; updateVer = ver
                    }
                }
            }.padding(20.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    when (updateStatus) {
                        "update" -> Icons.Default.SystemUpdateAlt
                        "checking" -> Icons.Default.HourglassTop
                        else -> Icons.Default.Update
                    }, contentDescription = null,
                    tint = if (updateStatus == "update") Color(0xFF22c55e) else t.text3, modifier = Modifier.size(24.dp))
                Spacer(Modifier.width(14.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        when (updateStatus) {
                            "update" -> tr["update_available"] ?: "Update Available"
                            "checking" -> tr["checking"] ?: "Checking..."
                            else -> tr["check_updates"] ?: "Check for Updates"
                        }, color = if (updateStatus == "update") Color(0xFF22c55e) else t.text, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
                    Text(
                        when (updateStatus) {
                            "update" -> tr["ready_install"] ?: "Version $updateVer ready to install"
                            "checking" -> tr["please_wait"] ?: "Please wait..."
                            else -> tr["current_ver"] ?: "Current: v0.1.0"
                        }, color = t.text4, fontSize = 11.sp)
                }
                if (updateStatus == "update") {
                    Icon(Icons.Default.ChevronRight, contentDescription = null, tint = Color(0xFF22c55e), modifier = Modifier.size(20.dp))
                }
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
    val tr = LocalTranslations.current
    Column(modifier = Modifier.fillMaxSize().padding(20.dp).navigationBarsPadding()) {
        Text(tr["themes"] ?: "Themes", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = t.text)
        Spacer(Modifier.height(8.dp))
        Text(tr["choose_category"] ?: "Choose a category...", color = t.text3, fontSize = 13.sp)
        Spacer(Modifier.height(24.dp))

        // Dark themes card
        ThemeCategoryCard(
            label = tr["dark_themes"] ?: "Dark Themes",
            count = allThemes.count { !it.value.isLight },
            previewColor = Color(0xFF0b101f),
            accentColor = Color(0xFF818cf8),
            t = t,
            onClick = { onSelectCategory("dark") }
        )
        Spacer(Modifier.height(16.dp))

        // Light themes card
        ThemeCategoryCard(
            label = tr["light_themes"] ?: "Light Themes",
            count = allThemes.count { it.value.isLight },
            previewColor = Color(0xFFece8e0),
            accentColor = Color(0xFF6366f1),
            t = t,
            onClick = { onSelectCategory("light") }
        )

        Spacer(Modifier.height(24.dp))
        Text(tr["current_theme"] ?: "Current: ${currentTheme.replaceFirstChar { it.uppercase() }}", color = t.text4, fontSize = 12.sp)
    }
}

@Composable
private fun ThemeCategoryCard(label: String, count: Int, previewColor: Color, accentColor: Color, t: ThemeColors, onClick: () -> Unit) {
    val tr = LocalTranslations.current
    Surface(shape = RoundedCornerShape(20.dp), color = t.bg3,
        modifier = Modifier.fillMaxWidth(), tonalElevation = 2.dp) {
        Row(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)).clickable(onClick = onClick).padding(20.dp), verticalAlignment = Alignment.CenterVertically) {
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
                Text(tr["themes_available"] ?: "$count themes available", color = t.text3, fontSize = 13.sp)
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
    val tr = LocalTranslations.current
    val themes = allThemes.filter { if (category == "dark") !it.value.isLight else it.value.isLight }
    var selectedTheme by remember { mutableStateOf(currentTheme) }

    Column(modifier = Modifier.fillMaxSize().padding(20.dp).navigationBarsPadding()) {
        Text(if (category == "dark") (tr["dark_themes"] ?: "Dark Themes") else (tr["light_themes"] ?: "Light Themes"),
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
        Text(tr["select_theme"] ?: "Select Theme", color = t.text4, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(bottom = 10.dp))
        LazyVerticalGrid(columns = GridCells.Fixed(2), modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp), verticalArrangement = Arrangement.spacedBy(10.dp),
            contentPadding = PaddingValues(bottom = 80.dp)) {
            items(themes.toList()) { (name, theme) ->
                val isSelected = name == selectedTheme
                Surface(shape = RoundedCornerShape(14.dp), color = t.bg3,
                    border = if (isSelected) androidx.compose.foundation.BorderStroke(2.dp, t.accent) else null,
                    modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).clickable {
                        selectedTheme = name; onThemeChange(name); appLog("Theme changed: $name")
                    }.padding(12.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(modifier = Modifier.size(26.dp).clip(RoundedCornerShape(6.dp)).background(theme.accent))
                            Spacer(Modifier.width(10.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(name.replaceFirstChar { it.uppercase() }, color = t.text, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                                Text(if (theme.isLight) (tr["light"] ?: "Light") else (tr["dark"] ?: "Dark"), color = t.text4, fontSize = 10.sp)
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
fun LanguageSection(t: ThemeColors, onLanguageChange: (String) -> Unit, onUseDeviceLang: () -> Unit) {
    val currentCode = LocalLangCode.current
    val tr = LocalTranslations.current
    val ctx = LocalContext.current
    val deviceLangCode = detectSystemLanguage(ctx)
    val deviceLangName = getLangByCode(deviceLangCode).name
    Column(modifier = Modifier.fillMaxSize().padding(24.dp).navigationBarsPadding()) {
        Text(tr["select_language"] ?: "Language", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = t.text)
        Spacer(Modifier.height(6.dp))
        Text(tr["available_languages"] ?: "Select your preferred language", color = t.text3, fontSize = 13.sp)
        Spacer(Modifier.height(24.dp))
        Surface(shape = RoundedCornerShape(16.dp), color = t.accent.copy(alpha = 0.12f),
            modifier = Modifier.fillMaxWidth().clickable { onUseDeviceLang() }) {
            Row(modifier = Modifier.padding(20.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.PhoneAndroid, contentDescription = null, tint = t.accent, modifier = Modifier.size(28.dp))
                Spacer(Modifier.width(14.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(tr["use_device_lang"] ?: "Use Device Language", color = t.accent, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
                    Text(deviceLangName, color = t.text3, fontSize = 12.sp)
                }
                Icon(Icons.Default.ChevronRight, contentDescription = null, tint = t.accent.copy(alpha = 0.5f), modifier = Modifier.size(20.dp))
            }
        }
        Spacer(Modifier.height(20.dp))
        Surface(shape = RoundedCornerShape(16.dp), color = t.bg3, modifier = Modifier.fillMaxWidth()) {
            Row(modifier = Modifier.padding(20.dp), verticalAlignment = Alignment.CenterVertically) {
                Text(getLangByCode(currentCode).flag, fontSize = 28.sp)
                Spacer(Modifier.width(14.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(tr["current_language"] ?: "Current Language", color = t.text4, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                    Text(getLangByCode(currentCode).name, color = t.text, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
                }
                Text(currentCode.uppercase(), color = t.text3, fontSize = 13.sp)
            }
        }
        Spacer(Modifier.height(20.dp))
        Text(tr["available_languages"] ?: "Available Languages", color = t.text4, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(bottom = 10.dp))
        getLanguages().forEach { lang ->
            val selected = lang.code == currentCode
            Surface(shape = RoundedCornerShape(16.dp), color = if (selected) t.accent.copy(alpha = 0.12f) else t.bg3,
                modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
                Row(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).clickable {
                    onLanguageChange(lang.code)
                }.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text(lang.flag, fontSize = 32.sp)
                    Spacer(Modifier.width(16.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(lang.name, color = t.text, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
                        Text(lang.code.uppercase(), color = t.text3, fontSize = 12.sp)
                    }
                    if (selected) Icon(Icons.Default.Check, contentDescription = null, tint = t.accent, modifier = Modifier.size(22.dp))
                }
            }
        }
    }
}

@Composable
fun DebugSection(t: ThemeColors) {
    val tr = LocalTranslations.current
    val listState = rememberLazyListState()
    var logs by remember { mutableStateOf(appLogs.toList()) }
    val clipboard = LocalClipboardManager.current
    var showCopied by remember { mutableStateOf(false) }
    var toastAnim by remember { mutableStateOf(0f) }

    LaunchedEffect(Unit) {
        while (true) {
            kotlinx.coroutines.delay(1000)
            logs = appLogs.toList()
            if (logs.isNotEmpty()) listState.animateScrollToItem(logs.size - 1)
        }
    }

    LaunchedEffect(showCopied) {
        if (showCopied) { toastAnim = 1f; delay(2000); toastAnim = 0f; delay(300); showCopied = false }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        Column(modifier = Modifier.fillMaxSize().padding(20.dp).navigationBarsPadding()) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text(tr["console"] ?: "Console", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = t.text)
                Row {
                    if (logs.isNotEmpty()) {
                        TextButton(onClick = {
                            clipboard.setText(AnnotatedString(logs.joinToString("\n")))
                            showCopied = true
                        }) { Text(tr["copy"] ?: "Copy", color = t.accent, fontSize = 12.sp) }
                    }
                    TextButton(onClick = { appLogs.clear(); logs = emptyList() }) { Text(tr["clear"] ?: "Clear", color = t.accent, fontSize = 12.sp) }
                }
            }
            Spacer(Modifier.height(12.dp))
            Box(modifier = Modifier.fillMaxSize()) {
                Surface(shape = RoundedCornerShape(12.dp), color = t.bg3,
                    modifier = Modifier.fillMaxSize()) {
                    Box(modifier = Modifier.fillMaxSize().clip(RoundedCornerShape(12.dp)).clickable {
                        if (logs.isNotEmpty()) {
                            clipboard.setText(AnnotatedString(logs.joinToString("\n")))
                            showCopied = true
                        }
                    }) {
                        if (logs.isEmpty()) {
                            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                                Text(tr["no_logs"] ?: "No logs yet", color = t.text4, fontSize = 13.sp)
                            }
                        } else {
                            LazyColumn(state = listState, modifier = Modifier.fillMaxSize().padding(10.dp)) {
                            items(logs) { log ->
                                Text(log, color = t.text3, fontSize = 10.sp, fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace, lineHeight = 15.sp)
                            }
                        }
                    }
                }
                // Toast positioned at bottom of console box
                if (showCopied || toastAnim > 0f) {
                    Box(modifier = Modifier.fillMaxWidth().padding(12.dp).align(Alignment.BottomCenter).graphicsLayer(
                        alpha = toastAnim,
                        scaleX = 0.6f + 0.4f * toastAnim,
                        scaleY = 0.6f + 0.4f * toastAnim
                    )) {
                        Surface(shape = RoundedCornerShape(50),
                            color = t.text.copy(alpha = 0.85f),
                            shadowElevation = 6.dp) {
                            Text(tr["copied"] ?: "Copied to clipboard", color = t.bg, fontSize = 14.sp,
                                fontWeight = FontWeight.SemiBold,
                                modifier = Modifier.padding(horizontal = 28.dp, vertical = 14.dp))
                        }
                    }
                }
            }
        }
    }
    }
}

@Composable
fun AboutSection(t: ThemeColors, onLogout: () -> Unit) {
    val tr = LocalTranslations.current
    Column(modifier = Modifier.fillMaxSize().padding(24.dp).navigationBarsPadding(), horizontalAlignment = Alignment.CenterHorizontally) {
        Spacer(Modifier.height(32.dp))
        Box(modifier = Modifier.size(80.dp).clip(RoundedCornerShape(20.dp)).background(t.accent), contentAlignment = Alignment.Center) {
            Text("W", fontSize = 36.sp, fontWeight = FontWeight.Bold, color = Color.White)
        }
        Spacer(Modifier.height(16.dp))
        Text(tr["waxmes"] ?: "WaxMes", fontSize = 26.sp, fontWeight = FontWeight.Bold, color = t.text)
        Text("v0.1.0", color = t.text4, fontSize = 14.sp)
        Spacer(Modifier.height(32.dp))
        Surface(shape = RoundedCornerShape(16.dp), color = t.bg3, modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(20.dp)) {
                AboutRow(tr["version"] ?: "Version", "0.1.0", t)
                AboutRow(tr["platform"] ?: "Platform", tr["android_native"] ?: "Android Native", t)
                AboutRow(tr["framework"] ?: "Framework", tr["jetpack_compose"] ?: "Jetpack Compose", t)
                AboutRow(tr["architecture"] ?: "Architecture", tr["mvvm_firebase"] ?: "MVVM + Firebase", t)
            }
        }
        Spacer(Modifier.height(24.dp))
        Text(tr["copyright"] ?: "\u00A9 2026 Waxur", color = t.text4, fontSize = 13.sp)
        Spacer(Modifier.weight(1f))
        Button(onClick = onLogout,
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFef4444)),
            modifier = Modifier.fillMaxWidth().height(52.dp),
            shape = RoundedCornerShape(14.dp)) {
            Icon(Icons.Default.Logout, contentDescription = null, tint = Color.White, modifier = Modifier.size(20.dp))
            Spacer(Modifier.width(8.dp))
            Text(tr["logout"] ?: "Logout", color = Color.White, fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
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
