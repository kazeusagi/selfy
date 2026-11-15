package io.github.kazeusagi.selfy.ui

import android.net.Uri
import androidx.activity.ComponentActivity
import androidx.activity.compose.LocalActivity
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import io.github.kazeusagi.selfy.SelfyApp
import io.github.kazeusagi.selfy.data.AlbumDetail
import io.github.kazeusagi.selfy.data.AlbumSummary
import io.github.kazeusagi.selfy.data.Photo
import io.github.kazeusagi.selfy.data.userMessage
import kotlinx.coroutines.launch

class AlbumsViewModel(private val app: SelfyApp) : ViewModel() {
    var albums by mutableStateOf<List<AlbumSummary>?>(null)
        private set
    var loading by mutableStateOf(false)
        private set
    var error by mutableStateOf<String?>(null)
        private set

    fun load() {
        viewModelScope.launch {
            loading = true
            error = null
            try {
                val list = app.api.albums()
                albums = list
                // 画面で見た分は既読にして、あとから通知が重ならないようにする
                app.watcher.update(list, notify = false)
            } catch (e: Exception) {
                error = e.userMessage()
            } finally {
                loading = false
            }
        }
    }

    fun create(title: String) {
        viewModelScope.launch {
            try {
                app.api.createAlbum(title)
                load()
            } catch (e: Exception) {
                error = e.userMessage()
            }
        }
    }
}

class AlbumViewModel(private val app: SelfyApp, private val id: String) : ViewModel() {
    var detail by mutableStateOf<AlbumDetail?>(null)
        private set
    var loading by mutableStateOf(false)
        private set
    var error by mutableStateOf<String?>(null)
        private set

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            loading = true
            error = null
            try {
                detail = app.api.album(id)
            } catch (e: Exception) {
                error = e.userMessage()
            } finally {
                loading = false
            }
        }
    }

    private fun replacePhotos(transform: (List<Photo>) -> List<Photo>) {
        detail = detail?.let { it.copy(photos = transform(it.photos)) }
    }

    fun toggleFavorite(photo: Photo) {
        val favorite = !photo.favorite
        // 押した手応えをすぐ返す。失敗したら元に戻す
        replacePhotos { list -> list.map { if (it.id == photo.id) it.copy(favorite = favorite) else it } }
        viewModelScope.launch {
            try {
                app.api.setFavorite(photo.id, favorite)
            } catch (e: Exception) {
                replacePhotos { list -> list.map { if (it.id == photo.id) it.copy(favorite = !favorite) else it } }
                error = e.userMessage()
            }
        }
    }

    fun delete(photo: Photo) {
        viewModelScope.launch {
            try {
                app.api.deletePhoto(photo.id)
                replacePhotos { list -> list.filter { it.id != photo.id } }
            } catch (e: Exception) {
                error = e.userMessage()
            }
        }
    }

    fun upload(uris: List<Uri>) {
        viewModelScope.launch { app.transfers.upload(id, uris) }
    }

    fun download(photos: List<Photo>) {
        viewModelScope.launch { app.transfers.download(id, photos) }
    }
}

// 写真の一覧と拡大表示で同じ状態を使うので、画面ではなくアクティビティに持たせる
@Composable
fun albumViewModel(app: SelfyApp, id: String): AlbumViewModel =
    viewModel(viewModelStoreOwner = LocalActivity.current as ComponentActivity, key = "album:$id") {
        AlbumViewModel(app, id)
    }
