package com.waxmes.app.ui.screens

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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(repo: Repository, currentTheme: String, onThemeChange: (String) -> Unit, onLogout: () -> Unit, onBack: () -> Unit) {
    val t = LocalTheme.current
    var selectedCategory by remember { mutableStateOf("profile") }

    ModalNavigationDrawer(
        drawerContent = {
            ModalDrawerSheet(containerColor = t.bg2) {
                Spacer(Modifier.height(24.dp))
                Text("WaxMes", fontWeight = FontWeight.Bold, fontSize = 20.sp, color = t.text, modifier = Modifier.padding(horizontal = 20.dp))
                Spacer(Modifier.height(16.dp))
                HorizontalDivider(color = t.border, modifier = Modifier.padding(horizontal = 16.dp))
                Spacer(Modifier.height(8.dp))
                // Profile
                Row(modifier = Modifier.fillMaxWidth().clickable { selectedCategory = "profile" }.padding(horizontal = 20.dp, vertical = 14.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Person, contentDescription = null, tint = if (selectedCategory == "profile") t.accent else t.text3, modifier = Modifier.size(22.dp))
                    Spacer(Modifier.width(16.dp))
                    Text("Profile", color = if (selectedCategory == "profile") t.accent else t.text, fontSize = 15.sp, fontWeight = if (selectedCategory == "profile") FontWeight.SemiBold else FontWeight.Normal)
                }
                // Themes
                Row(modifier = Modifier.fillMaxWidth().clickable { selectedCategory = "themes" }.padding(horizontal = 20.dp, vertical = 14.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Palette, contentDescription = null, tint = if (selectedCategory == "themes") t.accent else t.text3, modifier = Modifier.size(22.dp))
                    Spacer(Modifier.width(16.dp))
                    Text("Themes", color = if (selectedCategory == "themes") t.accent else t.text, fontSize = 15.sp, fontWeight = if (selectedCategory == "themes") FontWeight.SemiBold else FontWeight.Normal)
                }
                // About
                Row(modifier = Modifier.fillMaxWidth().clickable { selectedCategory = "about" }.padding(horizontal = 20.dp, vertical = 14.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Info, contentDescription = null, tint = if (selectedCategory == "about") t.accent else t.text3, modifier = Modifier.size(22.dp))
                    Spacer(Modifier.width(16.dp))
                    Text("About", color = if (selectedCategory == "about") t.accent else t.text, fontSize = 15.sp, fontWeight = if (selectedCategory == "about") FontWeight.SemiBold else FontWeight.Normal)
                }
                Spacer(Modifier.weight(1f))
                HorizontalDivider(color = t.border, modifier = Modifier.padding(horizontal = 16.dp))
                // Logout
                Row(modifier = Modifier.fillMaxWidth().clickable(onClick = onLogout).padding(horizontal = 20.dp, vertical = 14.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Logout, contentDescription = null, tint = Color(0xFFef4444), modifier = Modifier.size(22.dp))
                    Spacer(Modifier.width(16.dp))
                    Text("Logout", color = Color(0xFFef4444), fontSize = 15.sp)
                }
                Spacer(Modifier.height(16.dp))
            }
        }
    ) {
        Scaffold(
            containerColor = t.bg,
            topBar = {
                TopAppBar(title = { Text("Settings", color = t.text) },
                    navigationIcon = { IconButton(onClick = {  }) { Icon(Icons.Default.Menu, contentDescription = null, tint = t.text) } },
                    actions = { IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, contentDescription = null, tint = t.text) } })
            }
        ) { padding ->
            Box(modifier = Modifier.fillMaxSize().padding(padding).background(t.bg)) {
                when (selectedCategory) {
                    "profile" -> ProfileSection(t, repo)
                    "themes" -> ThemesSection(t, currentTheme, onThemeChange)
                    "about" -> AboutSection(t)
                }
            }
        }
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

@Composable
fun ThemesSection(t: ThemeColors, currentTheme: String, onThemeChange: (String) -> Unit) {
    LazyColumn(modifier = Modifier.fillMaxSize().padding(20.dp)) {
        item { Text("Themes", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = t.text) }
        item { Spacer(Modifier.height(16.dp)) }
        items(allThemes.keys.toList()) { themeName ->
            val theme = allThemes[themeName]!!
            val isSelected = themeName == currentTheme
            Surface(shape = RoundedCornerShape(10.dp), color = t.bg3,
                border = if (isSelected) androidx.compose.foundation.BorderStroke(2.dp, t.accent) else null,
                modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp).clickable { onThemeChange(themeName) }) {
                Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                    Box(modifier = Modifier.size(36.dp).background(theme.accent, RoundedCornerShape(8.dp)))
                    Spacer(Modifier.width(12.dp))
                    Text(themeName.replaceFirstChar { it.uppercase() }, color = t.text, fontSize = 14.sp, modifier = Modifier.weight(1f))
                    if (isSelected) Icon(Icons.Default.Check, contentDescription = null, tint = t.accent, modifier = Modifier.size(18.dp))
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
        Row(modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp)) { Text("Version", color = t.text3, fontSize = 13.sp, modifier = Modifier.width(100.dp)); Text("0.1.0", color = t.text, fontSize = 13.sp) }
        Row(modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp)) { Text("Platform", color = t.text3, fontSize = 13.sp, modifier = Modifier.width(100.dp)); Text("Android Native", color = t.text, fontSize = 13.sp) }
        Spacer(Modifier.height(20.dp))
        Text("\u00A9 2026 Waxur", color = t.text4, fontSize = 12.sp)
    }
}