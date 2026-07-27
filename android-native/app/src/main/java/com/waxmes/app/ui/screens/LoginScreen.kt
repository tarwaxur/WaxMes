package com.waxmes.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.waxmes.app.data.Repository
import com.waxmes.app.ui.theme.*
import kotlinx.coroutines.launch

@Composable
fun LoginScreen(repo: Repository, onLogin: () -> Unit) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var name by remember { mutableStateOf("") }
    var isRegister by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf("") }
    val scope = rememberCoroutineScope()

    Column(modifier = Modifier.fillMaxSize().background(Bg).padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
        Text("WaxMes", fontSize = 28.sp, fontWeight = FontWeight.Bold, color = Text)
        Spacer(Modifier.height(32.dp))
        if (isRegister) {
            OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Name") }, modifier = Modifier.fillMaxWidth(), singleLine = true,
                colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Accent, unfocusedBorderColor = Border, focusedLabelColor = Accent, cursorColor = Accent, focusedTextColor = Text, unfocusedTextColor = Text))
            Spacer(Modifier.height(12.dp))
        }
        OutlinedTextField(value = email, onValueChange = { email = it }, label = { Text("Email") }, modifier = Modifier.fillMaxWidth(), singleLine = true,
            colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Accent, unfocusedBorderColor = Border, focusedLabelColor = Accent, cursorColor = Accent, focusedTextColor = Text, unfocusedTextColor = Text))
        Spacer(Modifier.height(12.dp))
        OutlinedTextField(value = password, onValueChange = { password = it }, label = { Text("Password") }, modifier = Modifier.fillMaxWidth(), singleLine = true, visualTransformation = PasswordVisualTransformation(),
            colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Accent, unfocusedBorderColor = Border, focusedLabelColor = Accent, cursorColor = Accent, focusedTextColor = Text, unfocusedTextColor = Text))
        Spacer(Modifier.height(20.dp))
        if (error.isNotEmpty()) { Text(error, color = Red, fontSize = 12.sp); Spacer(Modifier.height(8.dp)) }
        Button(onClick = {
            scope.launch {
                error = ""; val ok = if (isRegister) repo.register(email, password, name) else repo.login(email, password)
                if (ok) onLogin() else error = if (isRegister) "Registration failed" else "Login failed"
            }
        }, modifier = Modifier.fillMaxWidth().height(48.dp), shape = RoundedCornerShape(10.dp), colors = ButtonDefaults.buttonColors(containerColor = Accent)) {
            Text(if (isRegister) "Register" else "Login", fontWeight = FontWeight.SemiBold)
        }
        Spacer(Modifier.height(12.dp))
        TextButton(onClick = { isRegister = !isRegister; error = "" }) { Text(if (isRegister) "Already have an account?" else "Create account", color = Accent, fontSize = 13.sp) }
    }
}