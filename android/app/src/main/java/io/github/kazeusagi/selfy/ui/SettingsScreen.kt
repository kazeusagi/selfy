package io.github.kazeusagi.selfy.ui

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import io.github.kazeusagi.selfy.BuildConfig
import io.github.kazeusagi.selfy.SelfyApp
import io.github.kazeusagi.selfy.data.UserSettings
import io.github.kazeusagi.selfy.data.userMessage
import kotlinx.coroutines.launch
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(app: SelfyApp, onBack: () -> Unit) {
    val scope = rememberCoroutineScope()
    val account by app.session.account.collectAsStateWithLifecycle()
    var settings by remember { mutableStateOf<UserSettings?>(null) }
    var notifyAlbums by remember { mutableStateOf(app.session.notifyAlbums) }
    var error by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        try {
            settings = app.api.settings()
        } catch (e: Exception) {
            error = e.userMessage()
        }
    }

    // 画面はすぐ切り替えて、サーバーに保存できなかったら元に戻す
    fun change(updated: UserSettings, key: String, value: Boolean) {
        val before = settings
        settings = updated
        scope.launch {
            try {
                app.api.updateSettings(buildJsonObject { put(key, value) })
            } catch (e: Exception) {
                settings = before
                error = e.userMessage()
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("設定") },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "戻る") }
                },
            )
        },
    ) { padding ->
        Column(Modifier.padding(padding).fillMaxSize().verticalScroll(rememberScrollState())) {
            ListItem(
                headlineContent = { Text(account?.email.orEmpty()) },
                supportingContent = { Text(account?.baseUrl?.removePrefix("https://").orEmpty()) },
            )
            HorizontalDivider()

            ListItem(
                headlineContent = { Text("共有アルバムの更新を通知") },
                supportingContent = { Text("ほかの人が写真を追加したときに知らせます。確認は15分以上の間隔なので、少し遅れて届きます") },
                trailingContent = {
                    Switch(
                        checked = notifyAlbums,
                        onCheckedChange = {
                            notifyAlbums = it
                            app.session.notifyAlbums = it
                        },
                    )
                },
            )
            settings?.let { current ->
                ListItem(
                    headlineContent = { Text("Wi-Fi のときだけアップロード") },
                    trailingContent = {
                        Switch(
                            checked = current.wifiOnly,
                            onCheckedChange = { change(current.copy(wifiOnly = it), "wifiOnly", it) },
                        )
                    },
                )
                ListItem(
                    headlineContent = { Text("元の画質で保存") },
                    supportingContent = { Text("オフにすると、大きな写真は縮小してからアップロードします") },
                    trailingContent = {
                        Switch(
                            checked = current.keepOriginal,
                            onCheckedChange = { change(current.copy(keepOriginal = it), "keepOriginal", it) },
                        )
                    },
                )
            }
            error?.let { Text(it, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(16.dp)) }
            HorizontalDivider()

            TextButton(onClick = { app.signOut() }, modifier = Modifier.padding(horizontal = 8.dp, vertical = 8.dp)) {
                Text("ログアウト", color = MaterialTheme.colorScheme.error)
            }
            Text(
                "バージョン ${BuildConfig.VERSION_NAME}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(16.dp),
            )
        }
    }
}
