package io.github.kazeusagi.selfy.transfer

import android.content.Intent
import android.net.Uri
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequest
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.OutOfQuotaPolicy
import androidx.work.WorkManager
import io.github.kazeusagi.selfy.SelfyApp
import io.github.kazeusagi.selfy.data.Photo
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

// 画面から転送を頼む入口。待ち行列に積んで、WorkManager に処理を任せる
class Transfers(private val app: SelfyApp) {
    private val work get() = WorkManager.getInstance(app)

    suspend fun upload(albumId: String, uris: List<Uri>) {
        val encoder = PhotoEncoder(app)
        val transfers = withContext(Dispatchers.IO) {
            uris.map { uri ->
                // 写真を選んだ直後の読み取り権限はアプリが終わると消えるので、送り終えるまで保持する
                try {
                    app.contentResolver.takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
                } catch (_: SecurityException) {
                    // 保持できない写真は、アプリが生きている間に送れる分だけ送る
                }
                Transfer(albumId, uri.toString(), encoder.displayName(uri))
            }
        }
        app.uploads.add(transfers)
        startUploads()
    }

    suspend fun download(albumId: String, photos: List<Photo>) {
        app.downloads.add(photos.map { Transfer(albumId, it.id, it.fileName) })
        startDownloads()
    }

    suspend fun retryUploads() {
        app.uploads.retryFailed()
        startUploads()
    }

    suspend fun retryDownloads() {
        app.downloads.retryFailed()
        startDownloads()
    }

    private suspend fun startUploads() {
        // Wi-Fi のときだけ送る設定は Web 版と共有している。読めなければ制限なしで始める
        val wifiOnly = try {
            app.api.settings().wifiOnly
        } catch (_: Exception) {
            false
        }
        val network = if (wifiOnly) NetworkType.UNMETERED else NetworkType.CONNECTED
        work.enqueueUniqueWork("upload", ExistingWorkPolicy.APPEND_OR_REPLACE, request<UploadWorker>(network))
    }

    private fun startDownloads() {
        work.enqueueUniqueWork("download", ExistingWorkPolicy.APPEND_OR_REPLACE, request<DownloadWorker>(NetworkType.CONNECTED))
    }

    private inline fun <reified W : TransferWorker> request(network: NetworkType): OneTimeWorkRequest =
        OneTimeWorkRequestBuilder<W>()
            .setConstraints(Constraints.Builder().setRequiredNetworkType(network).build())
            // ユーザーが頼んだ転送なので、すぐに始める
            .setExpedited(OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST)
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
            .build()
}
