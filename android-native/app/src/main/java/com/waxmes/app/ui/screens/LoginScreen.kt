package com.waxmes.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.waxmes.app.data.Repository
import com.waxmes.app.data.LocalTranslations
import com.waxmes.app.ui.theme.*

@Composable
fun LoginScreen(repo: Repository, onLogin: () -> Unit) {
    val t = LocalTheme.current
    val tr = LocalTranslations.current
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var name by remember { mutableStateOf("") }
    var isRegister by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(false) }

    Column(modifier = Modifier.fillMaxSize().background(t.bg).padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
        Text(tr["waxmes"] ?: "WaxMes", fontSize = 28.sp, fontWeight = FontWeight.Bold, color = t.text)
        Spacer(Modifier.height(32.dp))
        if (isRegister) {
            OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text(tr["name"] ?: "Name") }, modifier = Modifier.fillMaxWidth(), singleLine = true, colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = t.accent, unfocusedBorderColor = t.border, focusedLabelColor = t.accent, cursorColor = t.accent, focusedTextColor = t.text, unfocusedTextColor = t.text))
            Spacer(Modifier.height(12.dp))
        }
        OutlinedTextField(value = email, onValueChange = { email = it }, label = { Text(tr["email_label"] ?: "Email") }, modifier = Modifier.fillMaxWidth(), singleLine = true, colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = t.accent, unfocusedBorderColor = t.border, focusedLabelColor = t.accent, cursorColor = t.accent, focusedTextColor = t.text, unfocusedTextColor = t.text))
        Spacer(Modifier.height(12.dp))
        OutlinedTextField(value = password, onValueChange = { password = it }, label = { Text(tr["password"] ?: "Password") }, modifier = Modifier.fillMaxWidth(), singleLine = true, visualTransformation = PasswordVisualTransformation(), colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = t.accent, unfocusedBorderColor = t.border, focusedLabelColor = t.accent, cursorColor = t.accent, focusedTextColor = t.text, unfocusedTextColor = t.text))
        Spacer(Modifier.height(20.dp))
        if (error.isNotEmpty()) { Text(error, color = Color(0xFFef4444), fontSize = 12.sp); Spacer(Modifier.height(8.dp)) }
        Button(onClick = {
            if (loading) return@Button; loading = true; error = ""
            val cb = { ok: Boolean -> loading = false; if (ok) onLogin() else error = if (isRegister) (tr["reg_failed"] ?: "Registration failed") else (tr["login_failed"] ?: "Login failed") }
            if (isRegister) repo.register(email, password, name, cb) else repo.login(email, password, cb)
        }, modifier = Modifier.fillMaxWidth().height(48.dp), shape = RoundedCornerShape(10.dp), colors = ButtonDefaults.buttonColors(containerColor = t.accent), enabled = !loading) {
            Text(if (isRegister) (tr["register"] ?: "Register") else (tr["login"] ?: "Login"), fontWeight = FontWeight.SemiBold)
        }
        Spacer(Modifier.height(12.dp))
        TextButton(onClick = { isRegister = !isRegister; error = "" }) { Text(if (isRegister) (tr["have_account"] ?: "Already have an account?") else (tr["create_account"] ?: "Create account"), color = t.accent, fontSize = 13.sp) }
    }
}