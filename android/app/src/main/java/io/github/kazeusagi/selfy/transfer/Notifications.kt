package io.github.kazeusagi.selfy.transfer

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import androidx.core.app.NotificationCompat
import androidx.work.ForegroundInfo
import io.github.kazeusagi.selfy.MainActivity
import io.github.kazeusagi.selfy.R

object Notifications {
    private const val TRANSFER = "transfer"
    private const val RESULT = "result"
    private const val ALBUMS = "albums"

    const val UPLOAD_PROGRESS = 1
    const val DOWNLOAD_PROGRESS = 2
    const val UPLOAD_RESULT = 3
    const val DOWNLOAD_RESULT = 4
    const val LOGIN_REQUIRED = 5

    fun createChannels(context: Context) {
        val manager = context.getSystemService(NotificationManager::class.java)
        manager.createNotificationChannels(
            listOf(
                // 進捗は頻繁に更新するので、音を鳴らさない
                NotificationChannel(TRANSFER, "転送の進捗", NotificationManager.IMPORTANCE_LOW),
                NotificationChannel(RESULT, "転送の結果", NotificationManager.IMPORTANCE_DEFAULT),
                NotificationChannel(ALBUMS, "共有アルバムの更新", NotificationManager.IMPORTANCE_DEFAULT),
            ),
        )
    }

    private fun builder(context: Context, channel: String, title: String): NotificationCompat.Builder {
        val open = PendingIntent.getActivity(
            context,
            0,
            Intent(context, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        return NotificationCompat.Builder(context, channel)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentIntent(open)
    }

    fun progress(context: Context, id: Int, title: String, done: Int, total: Int): ForegroundInfo {
        val notification = builder(context, TRANSFER, title)
            .setContentText(if (total > 0) "$done / $total 枚" else null)
            .setProgress(total, done, total == 0)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .build()
        return ForegroundInfo(id, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
    }

    fun result(context: Context, id: Int, title: String, text: String?) =
        show(context, id, builder(context, RESULT, title).setContentText(text))

    fun albumUpdate(context: Context, albumId: String, text: String) =
        show(context, albumId.hashCode(), builder(context, ALBUMS, "Selfy").setContentText(text))

    private fun show(context: Context, id: Int, builder: NotificationCompat.Builder) {
        val manager = context.getSystemService(NotificationManager::class.java)
        // 通知を許可していない端末では何もしない
        if (!manager.areNotificationsEnabled()) return
        manager.notify(id, builder.setAutoCancel(true).build())
    }
}
