plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    id("com.google.gms.google-services")
}

android {
    namespace = "com.waxmes.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.waxmes.app"
        minSdk = 26
        targetSdk = 35
        versionCode = 2
        versionName = "0.1.0"
    }

    signingConfigs {
        create("waxmes") {
            val ks = rootProject.file("keystore/waxmes-release.jks")
            if (ks.exists()) {
                storeFile = ks
                storePassword = System.getenv("WAXMES_KEYSTORE_PASS") ?: "waxmes-key-2026"
                keyAlias = "waxmes"
                keyPassword = System.getenv("WAXMES_KEY_PASS") ?: "waxmes-key-2026"
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("waxmes")
        }
        debug {
            signingConfig = signingConfigs.getByName("waxmes")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
    }
}

dependencies {
    // Compose
    implementation(platform("androidx.compose:compose-bom:2024.12.01"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.activity:activity-compose:1.9.3")
    implementation("androidx.navigation:navigation-compose:2.8.5")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.7")

    // Firebase
    implementation(platform("com.google.firebase:firebase-bom:33.7.0"))
    implementation("com.google.firebase:firebase-auth")
    implementation("com.google.firebase:firebase-firestore")
    implementation("com.google.firebase:firebase-storage")

    // Crypto
    implementation("androidx.security:security-crypto:1.1.0-alpha06")

    // Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-play-services:1.9.0")

    // Accompanist (system UI controller)
    implementation("com.google.accompanist:accompanist-systemuicontroller:0.36.0")

    // Image loading
    implementation("io.coil-kt:coil-compose:2.7.0")
}