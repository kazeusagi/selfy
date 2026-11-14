package io.github.kazeusagi.selfy.transfer

import android.content.Context
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import io.github.kazeusagi.selfy.SelfyApp
import io.github.kazeusagi.selfy.data.ApiException
import java.io.IOException
import java.util.concurrent.TimeUnit

class AlbumCheckWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        val app = applicationContext as SelfyApp
        if (app.session.account.value == null || !app.session.notifyAlbums) return Result.success()
        return try {
            app.watcher.update(app.api.albums(), notify = true)
            Result.success()
        } catch (_: ApiException) {
            // ログイン切れなどは、次にアプリを開いたときに画面で分かる
            Result.success()
        } catch (_: IOException) {
            Result.retry()
        }
    }

    companion object {
        // 15分は Android が許す最短の間隔。実際の実行は端末の省電力の都合でそれより遅れる
        fun schedule(context: Context) {
            val request = PeriodicWorkRequestBuilder<AlbumCheckWorker>(15, TimeUnit.MINUTES)
                .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
                .build()
            WorkManager.getInstance(context)
                .enqueueUniquePeriodicWork("album-check", ExistingPeriodicWorkPolicy.KEEP, request)
        }
    }
}
