package io.github.kazeusagi.selfy.ui

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.lifecycle.viewmodel.compose.viewModel
import coil3.compose.AsyncImage
import io.github.kazeusagi.selfy.SelfyApp
import io.github.kazeusagi.selfy.data.AlbumSummary

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AlbumsScreen(app: SelfyApp, onOpen: (String) -> Unit, onSettings: () -> Unit) {
    val vm = viewModel { AlbumsViewModel(app) }
    var creating by remember { mutableStateOf(false) }

    // アルバムから戻ってきたときも、枚数やカバーを新しくする
    LaunchedEffect(Unit) { vm.load() }

    // 転送の進捗や共有アルバムの更新を知らせるには、Android 13 以降は許可が要る
    val context = LocalContext.current
    val askNotifications = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) {}
    LaunchedEffect(Unit) {
        if (Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) {
            askNotifications.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("アルバム") },
                actions = {
                    IconButton(onClick = onSettings) { Icon(Icons.Default.Settings, contentDescription = "設定") }
                },
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { creating = true },
                containerColor = MaterialTheme.colorScheme.primary,
                contentColor = MaterialTheme.colorScheme.onPrimary,
            ) { Icon(Icons.Default.Add, contentDescription = "アルバムを作る") }
        },
    ) { padding ->
        Column(Modifier.padding(padding)) {
            TransferBanner(app)
            PullToRefreshBox(isRefreshing = vm.loading, onRefresh = { vm.load() }, modifier = Modifier.fillMaxSize()) {
                val albums = vm.albums.orEmpty()
                LazyVerticalGrid(
                    columns = GridCells.Fixed(2),
                    contentPadding = PaddingValues(16.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                    modifier = Modifier.fillMaxSize(),
                ) {
                    vm.error?.let { message ->
                        item(span = { GridItemSpan(maxLineSpan) }) { Text(message, color = MaterialTheme.colorScheme.error) }
                    }
                    if (vm.albums?.isEmpty() == true) {
                        item(span = { GridItemSpan(maxLineSpan) }) {
                            Text("アルバムがまだありません", color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                    items(albums, key = { it.id }) { album -> AlbumCard(app, album, onClick = { onOpen(album.id) }) }
                }
            }
        }
    }

    if (creating) {
        var title by remember { mutableStateOf("") }
        AlertDialog(
            onDismissRequest = { creating = false },
            title = { Text("アルバムを作る") },
            text = {
                OutlinedTextField(value = title, onValueChange = { title = it.take(100) }, label = { Text("名前") }, singleLine = true)
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        vm.create(title.trim())
                        creating = false
                    },
                    enabled = title.isNotBlank(),
                ) { Text("作る") }
            },
            dismissButton = { TextButton(onClick = { creating = false }) { Text("やめる") } },
        )
    }
}

@Composable
private fun AlbumCard(app: SelfyApp, album: AlbumSummary, onClick: () -> Unit) {
    Column(Modifier.clickable(onClick = onClick), verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Box(
            Modifier
                .fillMaxWidth()
                .aspectRatio(1f)
                .clip(RoundedCornerShape(14.dp))
                .background(MaterialTheme.colorScheme.surfaceVariant),
        ) {
            album.coverId?.let { cover ->
                AsyncImage(
                    model = app.api.photoUrl(cover, "thumb"),
                    contentDescription = null,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize(),
                )
            }
        }
        Text(
            album.title,
            style = MaterialTheme.typography.titleSmall,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.padding(top = 6.dp),
        )
        Text(
            if (album.owned) "${album.count}枚" else "${album.count}枚 · 共有",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}
