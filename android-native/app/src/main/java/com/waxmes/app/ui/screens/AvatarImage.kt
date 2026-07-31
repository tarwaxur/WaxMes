package com.waxmes.app.ui.screens

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.Base64
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

@Composable
fun AvatarImage(
    url: String,
    fallbackText: String,
    modifier: Modifier = Modifier,
    bgColor: Color = Color(0xFF818CF8),
    textColor: Color = Color.White,
    fontSize: TextUnit = 18.sp
) {
    var bitmap by remember { mutableStateOf<Bitmap?>(null) }

    LaunchedEffect(url) {
        bitmap = if (url.startsWith("data:image/")) {
            withContext(Dispatchers.IO) {
                try {
                    val base64 = url.substringAfter(",")
                    val bytes = Base64.decode(base64, Base64.DEFAULT)
                    BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
                } catch (e: Exception) {
                    null
                }
            }
        } else if (url.isNotEmpty()) {
            null // not a data URL, let Coil handle it
        } else null
    }

    if (bitmap != null) {
        Image(bitmap = bitmap!!.asImageBitmap(), contentDescription = null,
            modifier = modifier.clip(CircleShape), contentScale = ContentScale.Crop)
    } else if (url.isNotEmpty() && !url.startsWith("data:")) {
        // Non-data URL, use Coil
        androidx.compose.foundation.layout.Box(modifier = modifier.background(bgColor, CircleShape), contentAlignment = Alignment.Center) {
            coil.compose.SubcomposeAsyncImage(model = url, contentDescription = null,
                modifier = Modifier.fillMaxSize().clip(CircleShape), contentScale = ContentScale.Crop,
                error = { TextFallback(fallbackText, textColor, fontSize) },
                loading = { TextFallback(fallbackText, textColor.copy(alpha = 0.5f), fontSize) })
        }
    } else {
        TextFallback(fallbackText, textColor, fontSize, modifier, bgColor)
    }
}

@Composable
private fun TextFallback(text: String, color: Color, fontSize: TextUnit,
                         modifier: Modifier = Modifier, bgColor: Color = Color(0xFF818CF8)) {
    Box(modifier = modifier.background(bgColor, CircleShape), contentAlignment = Alignment.Center) {
        TextFallbackContent(text, color, fontSize)
    }
}

@Composable
private fun TextFallbackContent(text: String, color: Color, fontSize: TextUnit) {
    val ch = text.firstOrNull()?.takeIf { it.isLetter() }?.uppercaseChar()
    androidx.compose.material3.Text(ch?.toString() ?: "?", color = color,
        fontWeight = FontWeight.Bold, fontSize = fontSize)
}
