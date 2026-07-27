package com.waxmes.app.ui.theme

import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.graphics.Color

data class ThemeColors(
    val bg: Color, val bg2: Color, val bg3: Color, val surface: Color,
    val border: Color, val border2: Color,
    val text: Color, val text2: Color, val text3: Color, val text4: Color,
    val accent: Color, val gradStart: Color, val gradEnd: Color,
    val inputBg: Color, val msgReceived: Color, val hover: Color,
    val sidebarBg: Color, val panelBg: Color, val isLight: Boolean
)

val allThemes = mapOf(
    "default" to ThemeColors(
        bg = Color(0xFF0b101f), bg2 = Color(0xFF0f1525), bg3 = Color(0xFF151d2e),
        surface = Color(0x03ffffff), border = Color(0x0affffff), border2 = Color(0x0fffffff),
        text = Color(0xFFffffff), text2 = Color(0xD9ffffff), text3 = Color(0x8cffffff), text4 = Color(0x40ffffff),
        accent = Color(0xFF818cf8), gradStart = Color(0xFF2563eb), gradEnd = Color(0xFF6d28d9),
        inputBg = Color(0x80303c46), msgReceived = Color(0x0affffff), hover = Color(0x08ffffff),
        sidebarBg = Color(0x03ffffff), panelBg = Color(0xFF0f1525), isLight = false
    ),
    "royal" to ThemeColors(bg = Color(0xFF0d0d1a), bg2 = Color(0xFF111122), bg3 = Color(0xFF161630), surface = Color(0x03ffffff), border = Color(0x0affffff), border2 = Color(0x0fffffff), text = Color(0xFFffffff), text2 = Color(0xD9ffffff), text3 = Color(0x8cffffff), text4 = Color(0x40ffffff), accent = Color(0xFF6366f1), gradStart = Color(0xFF4f46e5), gradEnd = Color(0xFF6366f1), inputBg = Color(0x80141432), msgReceived = Color(0x0affffff), hover = Color(0x08ffffff), sidebarBg = Color(0x03ffffff), panelBg = Color(0xFF111122), isLight = false),
    "forest" to ThemeColors(bg = Color(0xFF0a140a), bg2 = Color(0xFF0e1a0e), bg3 = Color(0xFF122212), surface = Color(0x03ffffff), border = Color(0x0affffff), border2 = Color(0x0fffffff), text = Color(0xFFffffff), text2 = Color(0xD9ffffff), text3 = Color(0x8cffffff), text4 = Color(0x40ffffff), accent = Color(0xFF22c55e), gradStart = Color(0xFF16a34a), gradEnd = Color(0xFF22c55e), inputBg = Color(0x800a1e0a), msgReceived = Color(0x0affffff), hover = Color(0x08ffffff), sidebarBg = Color(0x03ffffff), panelBg = Color(0xFF0e1a0e), isLight = false),
    "navy" to ThemeColors(bg = Color(0xFF0a0e27), bg2 = Color(0xFF0d1230), bg3 = Color(0xFF111738), surface = Color(0x03ffffff), border = Color(0x0affffff), border2 = Color(0x0fffffff), text = Color(0xFFffffff), text2 = Color(0xD9ffffff), text3 = Color(0x8cffffff), text4 = Color(0x40ffffff), accent = Color(0xFF60a5fa), gradStart = Color(0xFF3b82f6), gradEnd = Color(0xFF60a5fa), inputBg = Color(0x800a1432), msgReceived = Color(0x0affffff), hover = Color(0x08ffffff), sidebarBg = Color(0x03ffffff), panelBg = Color(0xFF0d1230), isLight = false),
    "cloud" to ThemeColors(bg = Color(0xFFece8e0), bg2 = Color(0xFFe4e0d8), bg3 = Color(0xFFdcd8d0), surface = Color(0x08000000), border = Color(0x0f000000), border2 = Color(0x1a000000), text = Color(0xFF1a1a2e), text2 = Color(0xD91a1a2e), text3 = Color(0x801a1a2e), text4 = Color(0x401a1a2e), accent = Color(0xFF6366f1), gradStart = Color(0xFF4f46e5), gradEnd = Color(0xFF6366f1), inputBg = Color(0x99ffffff), msgReceived = Color(0x0a000000), hover = Color(0x0a000000), sidebarBg = Color(0x05000000), panelBg = Color(0xFFe4e0d8), isLight = true),
)

val defaultTheme = allThemes["default"]!!
val LocalTheme = compositionLocalOf { defaultTheme }
val LocalThemeName = compositionLocalOf { "default" }

@Composable
fun WaxMesTheme(themeName: String = "default", content: @Composable () -> Unit) {
    val t = allThemes[themeName] ?: defaultTheme
    val colorScheme = if (t.isLight) lightColorScheme(
        primary = t.accent, onPrimary = Color.White, background = t.bg, surface = t.bg2,
        onBackground = t.text, onSurface = t.text, secondary = t.text2, outline = t.border,
        surfaceVariant = t.bg3, onSurfaceVariant = t.text3,
    ) else darkColorScheme(
        primary = t.accent, onPrimary = Color.White, background = t.bg, surface = t.bg2,
        onBackground = t.text, onSurface = t.text, secondary = t.text2, outline = t.border,
        surfaceVariant = t.bg3, onSurfaceVariant = t.text3,
    )
    CompositionLocalProvider(LocalTheme provides t, LocalThemeName provides themeName) {
        MaterialTheme(colorScheme = colorScheme, content = content)
    }
}