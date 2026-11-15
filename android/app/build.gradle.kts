plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    id("org.jetbrains.kotlin.plugin.serialization")
}

// 署名鍵は CI の Secrets から渡す。リポジトリが公開なので、鍵もパスワードもここには置かない
val keystore = System.getenv("SELFY_KEYSTORE")?.let(::file)?.takeIf { it.exists() }

android {
    namespace = "io.github.kazeusagi.selfy"
    compileSdk = 36

    defaultConfig {
        applicationId = "io.github.kazeusagi.selfy"
        // WebP の書き出し (WEBP_LOSSY) が Android 11 からなので、それより前は対象にしない
        minSdk = 30
        targetSdk = 36
        versionCode = System.getenv("SELFY_VERSION_CODE")?.toIntOrNull() ?: 1
        versionName = System.getenv("SELFY_VERSION_NAME") ?: "dev"
    }

    signingConfigs {
        if (keystore != null) {
            create("release") {
                storeFile = keystore
                storePassword = System.getenv("SELFY_KEYSTORE_PASSWORD")
                keyAlias = System.getenv("SELFY_KEY_ALIAS")
                keyPassword = System.getenv("SELFY_KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        release {
            // 鍵がないときもビルドは通す。その APK はデバッグ鍵の署名なので、上書き更新はできない
            signingConfig = signingConfigs.findByName("release") ?: signingConfigs.getByName("debug")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }
}

kotlin {
    jvmToolchain(17)
}

dependencies {
    implementation(platform("androidx.compose:compose-bom:2025.09.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.foundation:foundation")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-core")

    implementation("androidx.core:core-ktx:1.17.0")
    implementation("androidx.activity:activity-compose:1.11.0")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.9.4")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.9.4")
    implementation("androidx.navigation:navigation-compose:2.9.5")
    implementation("androidx.work:work-runtime-ktx:2.10.5")
    implementation("androidx.exifinterface:exifinterface:1.4.1")

    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.10.2")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.9.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("io.coil-kt.coil3:coil-compose:3.3.0")
    implementation("io.coil-kt.coil3:coil-network-okhttp:3.3.0")

    testImplementation("junit:junit:4.13.2")
}
