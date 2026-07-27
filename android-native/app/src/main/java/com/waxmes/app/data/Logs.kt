package com.waxmes.app.data

val appLogs = mutableListOf<String>()
fun appLog(msg: String) {
    val time = java.text.SimpleDateFormat("HH:mm:ss", java.util.Locale.getDefault()).format(java.util.Date())
    val entry = "[$time] $msg"
    appLogs.add(entry)
    if (appLogs.size > 500) appLogs.removeAt(0)
    android.util.Log.d("WaxMes", entry)
}