package io.github.kazeusagi.selfy.ui

import android.widget.Toast
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.itemsIndexed
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil3.compose.AsyncImage
import io.github.kazeusagi.selfy.R
import io.github.kazeusagi.selfy.SelfyApp
import io.github.kazeusagi.selfy.transfer.TransferState

@OptIn(ExperimentalMaterial3Api::class, ExperimentalFoundationApi::class)
@Composable
fun AlbumScreen(app: SelfyApp, id: String, onBack: () -> Unit, onView: (Int) -> Unit) {
    val vm = albumViewModel(app, id)
    val context = LocalContext.current
    val photos = vm.detail?.photos.orEmpty()
    var selected by remember { mutableStateOf(emptySet<String>()) }

    val picker = rememberLauncherForActivityResult(ActivityResultContracts.PickMultipleVisualMedia()) { uris ->
        if (uris.isNotEmpty()) {
            vm.upload(uris)
            Toast.makeText(context, "${uris.size}枚のアップロードを始めます", Toast.LENGTH_SHORT).show()
        }
    }

    fun saveSelected() {
        val targets = photos.filter { it.id in selected }
        vm.download(targets)
        Toast.makeText(context, "${targets.size}枚の保存を始めます", Toast.LENGTH_SHORT).show()
        selected = emptySet()
    }

    BackHandler(enabled = selected.isNotEmpty()) { selected = emptySet() }

    // アップロードが1枚終わるたびに一覧へ反映する
    val uploads by app.uploads.items.collectAsStateWithLifecycle()
    val uploaded = uploads.count { it.albumId == id && it.state == TransferState.DONE }
    LaunchedEffect(uploaded) {
        if (uploaded > 0) vm.load()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(if (selected.isEmpty()) vm.detail?.album?.title.orEmpty() else "${selected.size}枚を選択中") },
                navigationIcon = {
                    if (selected.isEmpty()) {
                        IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "戻る") }
                    } else {
                        IconButton(onClick = { selected = emptySet() }) { Icon(Icons.Default.Close, contentDescription = "選択をやめる") }
                    }
                },
                actions = {
                    if (selected.isNotEmpty()) {
                        TextButton(onClick = { selected = photos.map { it.id }.toSet() }) { Text("すべて選ぶ") }
                        IconButton(onClick = { saveSelected() }) {
                            Icon(painterResource(R.drawable.ic_download), contentDescription = "選んだ写真を端末に保存")
                        }
                    }
                },
            )
        },
        floatingActionButton = {
            if (vm.detail?.canAdd == true && selected.isEmpty()) {
                FloatingActionButton(
                    onClick = { picker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) },
                    containerColor = MaterialTheme.colorScheme.primary,
                    contentColor = MaterialTheme.colorScheme.onPrimary,
                ) { Icon(Icons.Default.Add, contentDescription = "写真を追加") }
            }
        },
    ) { padding ->
        Column(Modifier.padding(padding)) {
            TransferBanner(app)
            PullToRefreshBox(isRefreshing = vm.loading, onRefresh = { vm.load() }, modifier = Modifier.fillMaxSize()) {
                LazyVerticalGrid(
                    columns = GridCells.Adaptive(110.dp),
                    horizontalArrangement = Arrangement.spacedBy(2.dp),
                    verticalArrangement = Arrangement.spacedBy(2.dp),
                    modifier = Modifier.fillMaxSize(),
                ) {
                    vm.error?.let { message ->
                        item(span = { GridItemSpan(maxLineSpan) }) {
                            Text(message, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(16.dp))
                        }
                    }
                    if (vm.detail?.photos?.isEmpty() == true) {
                        item(span = { GridItemSpan(maxLineSpan) }) {
                            Text(
                                "写真がまだありません",
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(16.dp),
                            )
                        }
                    }
                    itemsIndexed(photos, key = { _, photo -> photo.id }) { index, photo ->
                        val isSelected = photo.id in selected
                        val toggle = { selected = if (isSelected) selected - photo.id else selected + photo.id }
                        Box(
                            Modifier
                                .aspectRatio(1f)
                                .background(MaterialTheme.colorScheme.surfaceVariant)
                                .combinedClickable(
                                    onClick = { if (selected.isEmpty()) onView(index) else toggle() },
                                    onLongClick = toggle,
                                ),
                        ) {
                            AsyncImage(
                                model = app.api.photoUrl(photo.id, "thumb"),
                                contentDescription = photo.fileName,
                                contentScale = ContentScale.Crop,
                                modifier = Modifier.fillMaxSize(),
                            )
                            if (isSelected) {
                                Box(Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.35f)))
                                Icon(
                                    Icons.Default.CheckCircle,
                                    contentDescription = "選択中",
                                    tint = Color.White,
                                    modifier = Modifier.align(Alignment.TopEnd).padding(6.dp),
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
