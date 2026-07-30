package com.waxmes.app

import android.content.Context
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.waxmes.app.data.LocalLangCode
import com.waxmes.app.data.LocalTranslations
import com.waxmes.app.data.Repository
import com.waxmes.app.data.detectSystemLanguage
import com.waxmes.app.data.getLangByCode
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
    val ctx = LocalContext.current
    val prefs = ctx.getSharedPreferences("waxmes", Context.MODE_PRIVATE)
    var isLoggedIn by remember { mutableStateOf(repo.auth.currentUser != null) }
    var currentTheme by remember { mutableStateOf(prefs.getString("theme", "default") ?: "default") }

    val savedLang = prefs.getString("app_language", "")
    val defaultLang = if (savedLang.isNullOrEmpty()) detectSystemLanguage(ctx) else savedLang
    var currentLang by remember { mutableStateOf(defaultLang) }
    val currentTranslations = remember { mutableStateOf(getLangByCode(defaultLang).translations) }

    fun updateLang(code: String) {
        currentLang = code
        currentTranslations.value = getLangByCode(code).translations
        prefs.edit().putString("app_language", code).apply()
    }

    LaunchedEffect(Unit) { repo.setContentResolver(ctx.contentResolver) }

    BackHandler(enabled = isLoggedIn) {
        val route = navController.currentBackStackEntry?.destination?.route
        if (route == "chats") {
            (ctx as? android.app.Activity)?.moveTaskToBack(true)
        } else if (route != null && route != "login") {
            navController.popBackStack()
        }
    }

    CompositionLocalProvider(
        LocalLangCode provides currentLang,
        LocalTranslations provides currentTranslations.value
    ) {
        WaxMesTheme(themeName = currentTheme) {
            val t = LocalTheme.current
            Surface(modifier = Modifier.fillMaxSize(), color = t.bg) {
                NavHost(navController, startDestination = if (isLoggedIn) "chats" else "login") {
                    composable("login") { LoginScreen(repo, onLogin = { isLoggedIn = true; navController.navigate("chats") { popUpTo("login") { inclusive = true } } }) }
                    composable("chats") { ChatListScreen(repo, onChatClick = { navController.navigate("chat/$it") }, onSettingsClick = { navController.navigate("settings") }) }
                    composable("chat/{convId}") { ChatScreen(repo, it.arguments?.getString("convId") ?: "", onBack = { navController.popBackStack() }) }
                    composable("settings") {
                        SettingsScreen(repo, currentTheme,
                            onThemeChange = { currentTheme = it; prefs.edit().putString("theme", it).apply() },
                            onLogout = { repo.logout(); prefs.edit().clear().apply(); isLoggedIn = false; navController.navigate("login") { popUpTo(0) { inclusive = true } } },
                            onBack = { navController.popBackStack() },
                            onLanguageChange = { updateLang(it) },
                            onUseDeviceLang = { updateLang(detectSystemLanguage(ctx)) })
                    }
                }
            }
        }
    }
}