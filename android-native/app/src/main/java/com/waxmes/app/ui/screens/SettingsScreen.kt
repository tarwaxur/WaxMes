package com.waxmes.app.ui.screens

import android.util.Log as AndroidLog
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
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
import com.waxmes.app.data.appLog
import com.waxmes.app.data.appLogs
import com.waxmes.app.ui.theme.*
import java.text.SimpleDateFormat
import java.util.*

// In-memory log capture
val _appLogs = mutableListOf<String>()
fun appLog(msg: String) {
    val time = SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(Date())
    val entry = "[$time] $msg"
    _appLogs.add(entry)
    if (_appLogs.size > 500) _appLogs.removeAt(0)
    AndroidLog.d("WaxMes", entry)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(repo: Repository, currentTheme: String, onThemeChange: (String) -> Unit, onLogout: () -> Unit, onBack: () -> Unit) {
    val t = LocalTheme.current
    var selectedCategory by remember { mutableStateOf("profile") }

    Scaffold(
        containerColor = t.bg,
        topBar = {
            TopAppBar(title = { Text("Settings", color = t.text) },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, contentDescription = null, tint = t.text) } })
        },
        bottomBar = {
            Surface(color = t.bg2, shadowElevation = 0.dp) {
                Row(modifier = Modifier.fillMaxWidth().padding(12.dp), horizontalArrangement = Arrangement.SpaceEvenly) {
                    FilterChip(selected = selectedCategory == "profile", onClick = { selectedCategory = "profile" }, label = { Text("Profile", fontSize = 12.sp) })
                    FilterChip(selected = selectedCategory == "themes", onClick = { selectedCategory = "themes" }, label = { Text("Themes", fontSize = 12.sp) })
                    FilterChip(selected = selectedCategory == "debug", onClick = { selectedCategory = "debug" }, label = { Text("Debug", fontSize = 12.sp) })
                    FilterChip(selected = selectedCategory == "about", onClick = { selectedCategory = "about" }, label = { Text("About", fontSize = 12.sp) })
                }
            }
        }
    ) { padding ->
        Box(modifier = Modifier.fillMaxSize().padding(padding).background(t.bg)) {
            when (selectedCategory) {
                "profile" -> ProfileSection(t, repo)
                "themes" -> ThemesSection(t, currentTheme, onThemeChange)
                "debug" -> DebugSection(t)
                "about" -> AboutSection(t, onLogout)
            }
        }
    }
}

@Composable
fun ProfileSection(t: ThemeColors, repo: Repository) {
    var name by remember { mutableStateOf("") }
    LaunchedEffect(Unit) { if (repo.uid.isNotEmpty()) repo.fetchUserName(repo.uid) { name = it; appLog("Profile loaded: $name") } }
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
                modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp).clickable { onThemeChange(themeName); appLog("Theme changed: $themeName") }) {
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
fun DebugSection(t: ThemeColors) {
    val listState = rememberLazyListState()
    var logs by remember { mutableStateOf(appLogs.toList()) }

    // Refresh logs every second
    LaunchedEffect(Unit) {
        while (true) {
            kotlinx.coroutines.delay(1000)
            logs = appLogs.toList()
            if (logs.isNotEmpty()) listState.animateScrollToItem(logs.size - 1)
        }
    }

    Column(modifier = Modifier.fillMaxSize().padding(20.dp)) {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Text("Console", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = t.text)
            TextButton(onClick = { appLogs.clear(); logs = emptyList() }) { Text("Clear", color = t.accent, fontSize = 11.sp) }
        }
        Spacer(Modifier.height(8.dp))
        Surface(shape = RoundedCornerShape(8.dp), color = t.bg3, modifier = Modifier.fillMaxSize()) {
            if (logs.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("No logs yet", color = t.text4, fontSize = 12.sp)
                }
            } else {
                LazyColumn(state = listState, modifier = Modifier.fillMaxSize().padding(8.dp)) {
                    items(logs) { log ->
                        Text(log, color = t.text3, fontSize = 9.sp, fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace, lineHeight = 14.sp)
                    }
                }
            }
        }
    }
}

@Composable
fun AboutSection(t: ThemeColors, onLogout: () -> Unit) {
    Column(modifier = Modifier.fillMaxSize().padding(20.dp)) {
        Text("About", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = t.text)
        Spacer(Modifier.height(20.dp))
        Row(modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp)) { Text("Version", color = t.text3, fontSize = 13.sp, modifier = Modifier.width(100.dp)); Text("0.1.0", color = t.text, fontSize = 13.sp) }
        Row(modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp)) { Text("Platform", color = t.text3, fontSize = 13.sp, modifier = Modifier.width(100.dp)); Text("Android Native", color = t.text, fontSize = 13.sp) }
        Spacer(Modifier.height(20.dp))
        Text("\u00A9 2026 Waxur", color = t.text4, fontSize = 12.sp)
        Spacer(Modifier.height(32.dp))
        Button(onClick = onLogout, colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFef4444)), modifier = Modifier.fillMaxWidth()) { Text("Logout", color = Color.White, fontWeight = FontWeight.SemiBold) }
    }
}