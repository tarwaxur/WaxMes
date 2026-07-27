package com.waxmes.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val Bg = Color(0xFF0a0e0a)
val Surface = Color(0xFF0d120d)
val Surface2 = Color(0xFF0b130b)
val Accent = Color(0xFF818cf8)
val Text = Color(0xFFe2e8f0)
val Text2 = Color(0xFF94a3b8)
val Text3 = Color(0xFF64748b)
val Text4 = Color(0xFF475569)
val Border = Color(0xFF1e293b)
val Border2 = Color(0xFF334155)
val Green = Color(0xFF22c55e)
val Red = Color(0xFFef4444)
val InputBg = Color(0xFF0f172a)

private val DarkColorScheme = darkColorScheme(
    primary = Accent, onPrimary = Color.White, background = Bg, surface = Surface,
    onBackground = Text, onSurface = Text, secondary = Text2,
    outline = Border, surfaceVariant = Surface2, onSurfaceVariant = Text3,
)

@Composable
fun WaxMesTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = DarkColorScheme, typography = Typography(), content = content)
}