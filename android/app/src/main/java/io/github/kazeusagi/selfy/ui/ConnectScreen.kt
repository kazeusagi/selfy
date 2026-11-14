package io.github.kazeusagi.selfy.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import io.github.kazeusagi.selfy.SelfyApp
import io.github.kazeusagi.selfy.data.userMessage
import kotlinx.coroutines.launch

private enum class Step { SERVER, EMAIL, CODE }

// Selfy は各自がホストするので、まず接続先のドメインを決めてからログインする
@Composable
fun ConnectScreen(app: SelfyApp) {
    val scope = rememberCoroutineScope()
    val savedHost = remember { app.session.baseUrl?.removePrefix("https://").orEmpty() }
    var step by rememberSaveable { mutableStateOf(if (savedHost.isEmpty()) Step.SERVER else Step.EMAIL) }
    var host by rememberSaveable { mutableStateOf(savedHost) }
    var email by rememberSaveable { mutableStateOf("") }
    var code by rememberSaveable { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    fun submit(action: suspend () -> Unit) {
        scope.launch {
            busy = true
            error = null
            try {
                action()
            } catch (e: Exception) {
                error = e.userMessage()
            } finally {
                busy = false
            }
        }
    }

    Surface(Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
        Column(
            Modifier
                .safeDrawingPadding()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 24.dp, vertical = 48.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Text("Selfy", style = MaterialTheme.typography.headlineLarge)

            when (step) {
                Step.SERVER -> {
                    Text("接続する Selfy のドメインを入力してください", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    OutlinedTextField(
                        value = host,
                        onValueChange = { host = it },
                        label = { Text("ドメイン") },
                        placeholder = { Text("photos.example.com") },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri),
                        modifier = Modifier.fillMaxWidth(),
                    )
                    Button(
                        onClick = {
                            submit {
                                app.api.connect(host)
                                step = Step.EMAIL
                            }
                        },
                        enabled = !busy && host.isNotBlank(),
                        modifier = Modifier.fillMaxWidth().height(52.dp),
                    ) { Text("次へ") }
                }

                Step.EMAIL -> {
                    Text("接続先: $host", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    OutlinedTextField(
                        value = email,
                        onValueChange = { email = it },
                        label = { Text("メールアドレス") },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                        modifier = Modifier.fillMaxWidth(),
                    )
                    Button(
                        onClick = {
                            submit {
                                app.api.sendCode(email.trim())
                                code = ""
                                step = Step.CODE
                            }
                        },
                        enabled = !busy && email.isNotBlank(),
                        modifier = Modifier.fillMaxWidth().height(52.dp),
                    ) { Text("確認コードを送る") }
                    TextButton(onClick = { step = Step.SERVER }, enabled = !busy) { Text("接続先を変える") }
                }

                Step.CODE -> {
                    Text("${email.trim()} に届いた6桁のコードを入力してください", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    OutlinedTextField(
                        value = code,
                        onValueChange = { value -> code = value.filter { it.isDigit() }.take(6) },
                        label = { Text("確認コード") },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
                        modifier = Modifier.fillMaxWidth(),
                    )
                    Button(
                        onClick = { submit { app.api.signIn(email.trim(), code) } },
                        enabled = !busy && code.length == 6,
                        modifier = Modifier.fillMaxWidth().height(52.dp),
                    ) { Text("ログイン") }
                    TextButton(onClick = { step = Step.EMAIL }, enabled = !busy) { Text("メールアドレスを入れ直す") }
                }
            }

            error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
        }
    }
}
