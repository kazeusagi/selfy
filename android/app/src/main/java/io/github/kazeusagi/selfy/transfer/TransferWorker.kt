package io.github.kazeusagi.selfy.transfer

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.ForegroundInfo
import androidx.work.WorkerParameters
import io.github.kazeusagi.selfy.SelfyApp
import io.github.kazeusagi.selfy.data.ApiException
import java.io.IOException
import kotlinx.coroutines.CancellationException

// 端末側の理由で、やり直しても成功しない失敗
class TransferFailure(message: String) : Exception(message)

// 待ち行列を先頭から1件ずつ処理する。アップロードとダウンロードで流れは同じなので共通にしてある
abstract class TransferWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    protected val app = context.applicationContext as SelfyApp

    protected abstract val queue: TransferQueue
    protected abstract val progressId: Int
    protected abstract val resultId: Int
    protected abstract val progressTitle: String
    protected abstract val doneTitle: String

    // 1件を処理して DONE か SKIPPED を返す。失敗は例外で知らせる
    protected abstract suspend fun process(item: Transfer): TransferState

    protected open suspend fun prepare() {}

    protected open fun release(item: Transfer) {}

    private fun progress(done: Int, total: Int): ForegroundInfo =
        Notifications.progress(applicationContext, progressId, progressTitle, done, total)

    override suspend fun getForegroundInfo(): ForegroundInfo = progress(0, 0)

    private suspend fun showProgress(done: Int, total: Int) {
        try {
            setForeground(progress(done, total))
        } catch (_: IllegalStateException) {
            // バックグラウンドからの再開では通知付きの実行に切り替えられないことがある。転送は続ける
        }
    }

    override suspend fun doWork(): Result {
        var done = 0
        var skipped = 0
        var failed = 0
        try {
            prepare()
            while (true) {
                val item = queue.next() ?: break
                val handled = done + skipped + failed
                showProgress(handled, handled + queue.items.value.count { it.state == TransferState.PENDING })
                try {
                    val state = process(item)
                    queue.mark(item.id, state)
                    release(item)
                    if (state == TransferState.DONE) done++ else skipped++
                } catch (e: TransferFailure) {
                    queue.mark(item.id, TransferState.FAILED, e.message)
                    failed++
                } catch (e: ApiException) {
                    if (e.status == 401) throw e
                    queue.mark(item.id, TransferState.FAILED, e.message)
                    failed++
                } catch (e: IOException) {
                    throw e
                } catch (e: CancellationException) {
                    throw e
                } catch (e: Exception) {
                    // 1件の想定外の失敗で、残りの転送まで止めない
                    queue.mark(item.id, TransferState.FAILED, "転送できませんでした")
                    failed++
                }
            }
        } catch (e: CancellationException) {
            throw e
        } catch (e: ApiException) {
            // サーバー側の一時的な不調なら、時間をおいてやり直す
            if (e.status != 401) return Result.retry()
            // ログインが切れた。残りは待ち行列に残るので、ログインし直せば再試行できる
            Notifications.result(applicationContext, Notifications.LOGIN_REQUIRED, "ログインが必要です", "Selfy を開いてログインし直してください")
            return Result.failure()
        } catch (e: IOException) {
            // 通信が切れた。処理中だったものは待ち行列に残っているので、つながったら続きから再開する
            return Result.retry()
        }

        if (done + skipped + failed > 0) {
            val parts = listOfNotNull(
                "${done}枚",
                if (skipped > 0) "追加済み ${skipped}枚" else null,
                if (failed > 0) "失敗 ${failed}枚" else null,
            )
            Notifications.result(applicationContext, resultId, doneTitle, parts.joinToString("、"))
        }
        queue.clearFinished()
        return Result.success()
    }
}
