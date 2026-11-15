package io.github.kazeusagi.selfy.transfer

import android.content.ContentValues
import android.content.Context
import android.os.Environment
import android.provider.MediaStore
import androidx.work.WorkerParameters
import java.io.InputStream

class DownloadWorker(context: Context, params: WorkerParameters) : TransferWorker(context, params) {
    override val queue get() = app.downloads
    override val progressId = Notifications.DOWNLOAD_PROGRESS
    override val resultId = Notifications.DOWNLOAD_RESULT
    override val progressTitle = "写真を保存中"
    override val doneTitle = "写真を保存しました"

    override suspend fun process(item: Transfer): TransferState {
        app.api.downloadOriginal(item.source) { type, stream -> saveToGallery(item.name, type, stream) }
        return TransferState.DONE
    }

    // 端末の「Pictures/Selfy」に入れる。ほかの写真アプリからも見えるようにするため
    private fun saveToGallery(name: String, type: String?, stream: InputStream) {
        val resolver = applicationContext.contentResolver
        val values = ContentValues().apply {
            put(MediaStore.MediaColumns.DISPLAY_NAME, name)
            put(MediaStore.MediaColumns.MIME_TYPE, type?.takeIf { it.startsWith("image/") } ?: "image/jpeg")
            put(MediaStore.MediaColumns.RELATIVE_PATH, "${Environment.DIRECTORY_PICTURES}/Selfy")
            // 書き終わるまで、ほかのアプリに途中のファイルを見せない
            put(MediaStore.MediaColumns.IS_PENDING, 1)
        }
        val collection = MediaStore.Images.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
        val uri = resolver.insert(collection, values) ?: throw TransferFailure("保存先を作れませんでした")
        try {
            resolver.openOutputStream(uri)!!.use { stream.copyTo(it) }
            resolver.update(uri, ContentValues().apply { put(MediaStore.MediaColumns.IS_PENDING, 0) }, null, null)
        } catch (e: Exception) {
            resolver.delete(uri, null, null)
            throw e
        }
    }
}
