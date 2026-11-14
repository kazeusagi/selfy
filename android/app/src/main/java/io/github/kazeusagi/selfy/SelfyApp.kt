package io.github.kazeusagi.selfy

import android.app.Application
import coil3.ImageLoader
import coil3.PlatformContext
import coil3.SingletonImageLoader
import coil3.network.okhttp.OkHttpNetworkFetcherFactory
import coil3.request.crossfade
import io.github.kazeusagi.selfy.data.Api
import io.github.kazeusagi.selfy.data.Session
import io.github.kazeusagi.selfy.transfer.AlbumCheckWorker
import io.github.kazeusagi.selfy.transfer.AlbumWatcher
import io.github.kazeusagi.selfy.transfer.Notifications
import io.github.kazeusagi.selfy.transfer.TransferQueue
import io.github.kazeusagi.selfy.transfer.Transfers
import java.io.File
import kotlinx.coroutines.MainScope
import kotlinx.coroutines.launch

class SelfyApp : Application(), SingletonImageLoader.Factory {
    private val scope = MainScope()

    lateinit var session: Session
        private set
    lateinit var api: Api
        private set
    lateinit var uploads: TransferQueue
        private set
    lateinit var downloads: TransferQueue
        private set
    lateinit var watcher: AlbumWatcher
        private set
    lateinit var transfers: Transfers
        private set

    override fun onCreate() {
        super.onCreate()
        session = Session(this)
        api = Api(session)
        uploads = TransferQueue(File(filesDir, "uploads.json"))
        downloads = TransferQueue(File(filesDir, "downloads.json"))
        watcher = AlbumWatcher(this)
        transfers = Transfers(this)
        Notifications.createChannels(this)
        AlbumCheckWorker.schedule(this)
    }

    // 画像の取得にもログインの Cookie が要るので、API と同じ通信クライアントを使う
    override fun newImageLoader(context: PlatformContext): ImageLoader =
        ImageLoader.Builder(context)
            .components { add(OkHttpNetworkFetcherFactory(callFactory = { api.client })) }
            .crossfade(true)
            .build()

    // 別のアカウントや接続先に前の人の写真や待ち行列を残さない。
    // ログアウトすると画面が切り替わって画面側の処理は打ち切られるので、アプリ側で最後まで実行する
    fun signOut() {
        scope.launch {
            uploads.clear()
            downloads.clear()
            watcher.clear()
            SingletonImageLoader.get(this@SelfyApp).apply {
                memoryCache?.clear()
                diskCache?.clear()
            }
            api.signOut()
        }
    }
}
