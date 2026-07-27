package com.waxmes.app

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
import com.waxmes.app.ui.theme.Bg

@Composable
fun WaxMesApp() {
    val repo = remember { Repository() }
    val navController = rememberNavController()
    var isLoggedIn by remember { mutableStateOf(false) }

    Surface(modifier = Modifier.fillMaxSize(), color = Bg) {
        NavHost(navController, startDestination = if (isLoggedIn) "chats" else "login") {
            composable("login") { LoginScreen(repo, onLogin = { isLoggedIn = true; navController.navigate("chats") { popUpTo("login") { inclusive = true } } }) }
            composable("chats") { ChatListScreen(repo, onChatClick = { navController.navigate("chat/$it") }) }
            composable("chat/{convId}") { ChatScreen(repo, it.arguments?.getString("convId") ?: "", onBack = { navController.popBackStack() }) }
        }
    }
}