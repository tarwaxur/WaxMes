package com.waxmes.app

import androidx.activity.compose.BackHandler
import androidx.compose.animation.*
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.waxmes.app.data.Repository
import com.waxmes.app.ui.screens.ChatListScreen
import com.waxmes.app.ui.screens.ChatScreen
import com.waxmes.app.ui.screens.LoginScreen
import com.waxmes.app.ui.screens.SettingsScreen
import com.waxmes.app.ui.theme.LocalTheme
import com.waxmes.app.ui.theme.WaxMesTheme

@Composable
fun WaxMesApp() {
    val repo = remember { Repository() }
    val navController = rememberNavController()
    var isLoggedIn by remember { mutableStateOf(false) }
    var currentTheme by remember { mutableStateOf("default") }

    BackHandler(enabled = navController.currentBackStackEntry?.destination?.route != "chats" && isLoggedIn) {
        navController.popBackStack()
    }

    WaxMesTheme(themeName = currentTheme) {
        val t = LocalTheme.current
        Surface(modifier = Modifier.fillMaxSize(), color = t.bg) {
            NavHost(navController, startDestination = if (isLoggedIn) "chats" else "login") {
                composable("login") { LoginScreen(repo, onLogin = { isLoggedIn = true; navController.navigate("chats") { popUpTo("login") { inclusive = true } } }) }
                composable("chats") { ChatListScreen(repo, onChatClick = { navController.navigate("chat/$it") }, onSettingsClick = { navController.navigate("settings") }) }
                composable("chat/{convId}") { ChatScreen(repo, it.arguments?.getString("convId") ?: "", onBack = { navController.popBackStack() }) }
                composable("settings") {
                    SettingsScreen(repo, currentTheme, onThemeChange = { currentTheme = it },
                        onLogout = { repo.logout(); isLoggedIn = false; navController.navigate("login") { popUpTo(0) { inclusive = true } } },
                        onBack = { navController.popBackStack() })
                }
            }
        }
    }
}