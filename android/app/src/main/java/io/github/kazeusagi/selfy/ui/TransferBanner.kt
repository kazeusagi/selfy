package io.github.kazeusagi.selfy.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import io.github.kazeusagi.selfy.SelfyApp
import io.github.kazeusagi.selfy.transfer.TransferQueue
import io.github.kazeusagi.selfy.transfer.TransferState
import kotlinx.coroutines.launch

// 転送の進み具合と失敗を画面の上に出す。通知を切っている人にも状況が分かるようにするため
@Composable
fun TransferBanner(app: SelfyApp) {
    Column {
        QueueStatus(app.uploads, "アップロード", onRetry = { app.transfers.retryUploads() })
        QueueStatus(app.downloads, "保存", onRetry = { app.transfers.retryDownloads() })
    }
}

@Composable
private fun QueueStatus(queue: TransferQueue, label: String, onRetry: suspend () -> Unit) {
    val scope = rememberCoroutineScope()
    val items by queue.items.collectAsStateWithLifecycle()
    val pending = items.count { it.state == TransferState.PENDING }
    val failed = items.count { it.state == TransferState.FAILED }
    val row = Modifier
        .fillMaxWidth()
        .background(MaterialTheme.colorScheme.surfaceVariant)
        .padding(horizontal = 16.dp)

    if (pending > 0) {
        Row(row.padding(vertical = 10.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            CircularProgressIndicator(Modifier.size(16.dp), strokeWidth = 2.dp)
            Text("${label}中（残り${pending}枚）", style = MaterialTheme.typography.bodyMedium)
        }
    }
    if (failed > 0) {
        Row(row, verticalAlignment = Alignment.CenterVertically) {
            Text(
                "${label}に失敗（${failed}枚）",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.error,
                modifier = Modifier.weight(1f),
            )
            TextButton(onClick = { scope.launch { onRetry() } }) { Text("再試行") }
            TextButton(onClick = { scope.launch { queue.clearFailed() } }) { Text("消す") }
        }
    }
}
