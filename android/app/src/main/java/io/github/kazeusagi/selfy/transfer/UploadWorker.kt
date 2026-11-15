package io.github.kazeusagi.selfy.transfer

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class UploadWorker(context: Context, params: WorkerParameters) : TransferWorker(context, params) {
    override val queue get() = app.uploads
    override val progressId = Notifications.UPLOAD_PROGRESS
    override val resultId = Notifications.UPLOAD_RESULT
    override val progressTitle = "写真をアップロード中"
    override val doneTitle = "アップロードが終わりました"

    private val encoder = PhotoEncoder(context)
    private val knownHashes = mutableMapOf<String, MutableSet<String>>()
    private var keepOriginal = true

    override suspend fun prepare() {
        keepOriginal = app.api.settings().keepOriginal
    }

    override suspend fun process(item: Transfer): TransferState {
        val uri = Uri.parse(item.source)
        // 重い変換を始める前に、追加済みの写真を除く
        val hashes = knownHashes.getOrPut(item.albumId) { app.api.existingHashes(item.albumId).toMutableSet() }
        val hash = readLocal { encoder.hash(uri) }
        if (hash in hashes) return TransferState.SKIPPED

        val upload = readLocal { encoder.prepare(uri, item.name, keepOriginal, hash) }
        val added = app.api.uploadPhoto(item.albumId, upload)
        hashes += hash
        return if (added) TransferState.DONE else TransferState.SKIPPED
    }

    // 端末の写真を読めなかったときは、通信の失敗と区別して再試行しない
    private suspend fun <T> readLocal(block: () -> T): T = withContext(Dispatchers.Default) {
        try {
            block()
        } catch (e: OutOfMemoryError) {
            throw TransferFailure("写真が大きすぎて変換できませんでした")
        } catch (e: IllegalArgumentException) {
            throw TransferFailure(e.message ?: "写真を読み込めませんでした")
        } catch (e: Exception) {
            throw TransferFailure("写真を読み込めませんでした")
        }
    }

    // 写真を選んだときにもらった読み取り権限は、端末ごとに数の上限があるので使い終えたら返す
    override fun release(item: Transfer) {
        try {
            applicationContext.contentResolver.releasePersistableUriPermission(
                Uri.parse(item.source),
                Intent.FLAG_GRANT_READ_URI_PERMISSION,
            )
        } catch (_: SecurityException) {
            // 権限を持っていなければ返すものもない
        }
    }
}
