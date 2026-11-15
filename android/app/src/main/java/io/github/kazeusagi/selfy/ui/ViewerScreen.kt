package io.github.kazeusagi.selfy.ui

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import coil3.compose.AsyncImage
import io.github.kazeusagi.selfy.R
import io.github.kazeusagi.selfy.SelfyApp

@Composable
fun ViewerScreen(app: SelfyApp, albumId: String, startIndex: Int, onBack: () -> Unit) {
    val vm = albumViewModel(app, albumId)
    val context = LocalContext.current
    val photos = vm.detail?.photos

    Box(Modifier.fillMaxSize().background(Color.Black)) {
        if (photos == null) {
            // アプリが再起動された直後は、一覧を読み直すまで待つ
            CircularProgressIndicator(Modifier.align(Alignment.Center), color = Color.White)
            return@Box
        }
        if (photos.isEmpty()) {
            // 最後の1枚を消したら一覧に戻る
            LaunchedEffect(Unit) { onBack() }
            return@Box
        }

        val pager = rememberPagerState(initialPage = startIndex.coerceIn(0, photos.lastIndex)) { photos.size }
        val current = photos.getOrNull(pager.currentPage)
        var confirmingDelete by remember { mutableStateOf(false) }

        HorizontalPager(state = pager, key = { photos.getOrNull(it)?.id ?: it }, modifier = Modifier.fillMaxSize()) { page ->
            val photo = photos.getOrNull(page) ?: return@HorizontalPager
            AsyncImage(
                model = app.api.photoUrl(photo.id, "display"),
                contentDescription = photo.fileName,
                contentScale = ContentScale.Fit,
                modifier = Modifier.fillMaxSize(),
            )
        }

        Row(
            Modifier
                .fillMaxWidth()
                .background(Color.Black.copy(alpha = 0.4f))
                .statusBarsPadding()
                .padding(horizontal = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(onClick = onBack) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "戻る", tint = Color.White)
            }
            Spacer(Modifier.weight(1f))
            if (current != null) {
                IconButton(onClick = { vm.toggleFavorite(current) }) {
                    Icon(
                        if (current.favorite) Icons.Default.Favorite else Icons.Default.FavoriteBorder,
                        contentDescription = if (current.favorite) "お気に入りから外す" else "お気に入りに入れる",
                        tint = Color.White,
                    )
                }
                IconButton(
                    onClick = {
                        vm.download(listOf(current))
                        Toast.makeText(context, "保存を始めます", Toast.LENGTH_SHORT).show()
                    },
                ) {
                    Icon(painterResource(R.drawable.ic_download), contentDescription = "端末に保存", tint = Color.White)
                }
                if (current.deletable) {
                    IconButton(onClick = { confirmingDelete = true }) {
                        Icon(Icons.Default.Delete, contentDescription = "削除", tint = Color.White)
                    }
                }
            }
        }

        if (confirmingDelete && current != null) {
            AlertDialog(
                onDismissRequest = { confirmingDelete = false },
                title = { Text("この写真を削除しますか？") },
                text = { Text("サーバーから削除され、元に戻せません。") },
                confirmButton = {
                    TextButton(
                        onClick = {
                            vm.delete(current)
                            confirmingDelete = false
                        },
                    ) { Text("削除") }
                },
                dismissButton = { TextButton(onClick = { confirmingDelete = false }) { Text("やめる") } },
            )
        }
    }
}
