package com.waxmes.app.ui.screens

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.waxmes.app.data.Repository
import com.waxmes.app.ui.theme.*
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class, ExperimentalAnimationApi::class)
@Composable
fun SettingsScreen(repo: Repository, currentTheme: String, onThemeChange: (String) -> Unit, onLogout: () -> Unit, onBack: () -> Unit) {
    val t = LocalTheme.current
    val scope = rememberCoroutineScope()
    var selectedCategory by remember { mutableStateOf("profile") }
    var showThemePicker by remember { mutableStateOf(false) }
    val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)

    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            ModalDrawerSheet(containerColor = t.bg2, drawerContainerColor = t.bg2) {
                Spacer(Modifier.height(24.dp))
                Text("WaxMes", fontWeight = FontWeight.Bold, fontSize = 20.sp, color = t.text, modifier = Modifier.padding(horizontal = 20.dp))
                Spacer(Modifier.height(16.dp))
                Divider(color = t.border)
                SettingsCategoryItem(t, "Profile", Icons.Default.Person, selectedCategory == "profile") { selectedCategory = "profile"; scope.launch { drawerState.close() } }
                SettingsCategoryItem(t, "Themes", Icons.Default.Palette, selectedCategory == "themes") { selectedCategory = "themes"; scope.launch { drawerState.close() } }
                SettingsCategoryItem(t, "About", Icons.Default.Info, selectedCategory == "about") { selectedCategory = "about"; scope.launch { drawerState.close() } }
                Spacer(Modifier.weight(1f))
                Divider(color = t.border)
                SettingsCategoryItem(t, "Logout", Icons.Default.Logout, false, onLogout, Color(0xFFef4444))
                Spacer(Modifier.height(16.dp))
            }
        },
        gesturesEnabled = true,
    ) {
        Scaffold(
            containerColor = t.bg,
            topBar = {
                TopAppBar(title = { Text("Settings", color = t.text) },
                    navigationIcon = { IconButton(onClick = { scope.launch { drawerState.open() } }) { Icon(Icons.Default.Menu, contentDescription = null, tint = t.text) } },
                    actions = { IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, contentDescription = null, tint = t.text) } })
            },
            bottomBar = {
                Surface(color = t.bg2) {
                    Row(modifier = Modifier.fillMaxWidth().padding(12.dp), horizontalArrangement = Arrangement.SpaceEvenly) {
                        CategoryChip(t, "Profile", selectedCategory == "profile") { selectedCategory = "profile" }
                        CategoryChip(t, "Themes", selectedCategory == "themes") { selectedCategory = "themes" }
                        CategoryChip(t, "About", selectedCategory == "about") { selectedCategory = "about" }
                    }
                }
            }
        ) { padding ->
            Box(modifier = Modifier.fillMaxSize().padding(padding).background(t.bg)) {
                AnimatedContent(targetState = selectedCategory, transitionSpec = { fadeIn() + slideInHorizontally() togetherWith fadeOut() + slideOutHorizontally() }) { cat ->
                    when (cat) {
                        "profile" -> ProfileSection(t, repo)
                        "themes" -> ThemesSection(t, currentTheme, onThemeChange)
                        "about" -> AboutSection(t)
                    }
                }
            }
        }
    }
}

@Composable
fun SettingsCategoryItem(t: ThemeColors, label: String, icon: androidx.compose.ui.graphics.vector.ImageVector, selected: Boolean, onClick: () -> Unit, color: Color? = null) {
    Row(modifier = Modifier.fillMaxWidth().clickable(onClick = onClick).padding(horizontal = 20.dp, vertical = 14.dp), verticalAlignment = Alignment.CenterVertically) {
        Icon(icon, contentDescription = null, tint = color ?: if (selected) t.accent else t.text3, modifier = Modifier.size(22.dp))
        Spacer(Modifier.width(16.dp))
        Text(label, color = color ?: if (selected) t.accent else t.text, fontSize = 15.sp, fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal)
    }
}

@Composable
fun CategoryChip(t: ThemeColors, label: String, selected: Boolean, onClick: () -> Unit) {
    Surface(shape = RoundedCornerShape(8.dp), color = if (selected) t.accent.copy(alpha = 0.15f) else t.bg3, modifier = Modifier.clickable(onClick = onClick)) {
        Text(label, modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp), color = if (selected) t.accent else t.text3, fontSize = 12.sp, fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal)
    }
}

@Composable
fun ProfileSection(t: ThemeColors, repo: Repository) {
    var name by remember { mutableStateOf("") }
    LaunchedEffect(Unit) { if (repo.uid.isNotEmpty()) repo.fetchUserName(repo.uid) { name = it } }
    Column(modifier = Modifier.fillMaxSize().padding(20.dp)) {
        Text("Profile", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = t.text)
        Spacer(Modifier.height(20.dp))
        Box(modifier = Modifier.size(72.dp).background(t.bg3, RoundedCornerShape(36.dp)), contentAlignment = Alignment.Center) {
            Text(if (name.isNotEmpty()) name.first().uppercase() else "?", fontSize = 28.sp, fontWeight = FontWeight.Bold, color = t.text2)
        }
        Spacer(Modifier.height(12.dp))
        Text(name.ifEmpty { "Loading..." }, color = t.text, fontSize = 18.sp, fontWeight = FontWeight.SemiBold)
        Spacer(Modifier.height(4.dp))
        Text(repo.auth.currentUser?.email ?: "", color = t.text3, fontSize = 13.sp)
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun ThemesSection(t: ThemeColors, currentTheme: String, onThemeChange: (String) -> Unit) {
    Column(modifier = Modifier.fillMaxSize().padding(20.dp)) {
        Text("Themes", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = t.text)
        Spacer(Modifier.height(16.dp))
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            allThemes.keys.forEach { themeName ->
                val theme = allThemes[themeName]!!
                val isSelected = themeName == currentTheme
                Surface(shape = RoundedCornerShape(10.dp), color = theme.bg2, border = if (isSelected) androidx.compose.foundation.BorderStroke(2.dp, t.accent) else null,
                    modifier = Modifier.width(100.dp).clickable { onThemeChange(themeName) }) {
                    Column(modifier = Modifier.padding(10.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                        Box(modifier = Modifier.size(40.dp).background(theme.accent, RoundedCornerShape(8.dp)))
                        Spacer(Modifier.height(6.dp))
                        Text(themeName.replaceFirstChar { it.uppercase() }, color = t.text3, fontSize = 10.sp, maxLines = 1)
                    }
                }
            }
        }
    }
}

@Composable
fun AboutSection(t: ThemeColors) {
    Column(modifier = Modifier.fillMaxSize().padding(20.dp)) {
        Text("About", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = t.text)
        Spacer(Modifier.height(20.dp))
        DetailRow(t, "Version", "0.1.0")
        DetailRow(t, "Platform", "Android Native (Kotlin + Compose)")
        DetailRow(t, "Firebase", "Auth + Firestore")
        Spacer(Modifier.height(20.dp))
        Text("© 2026 Waxur", color = t.text4, fontSize = 12.sp)
    }
}

@Composable
fun DetailRow(t: ThemeColors, label: String, value: String) {
    Row(modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp)) {
        Text(label, color = t.text3, fontSize = 13.sp, modifier = Modifier.width(100.dp))
        Text(value, color = t.text, fontSize = 13.sp)
    }
}