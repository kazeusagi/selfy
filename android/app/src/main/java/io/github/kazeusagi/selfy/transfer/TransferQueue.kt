package io.github.kazeusagi.selfy.transfer

import java.io.File
import java.util.UUID
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

enum class TransferState { PENDING, DONE, SKIPPED, FAILED }

// source はアップロードなら端末の写真の URI、ダウンロードならサーバーの写真 ID
@Serializable
data class Transfer(
    val albumId: String,
    val source: String,
    val name: String,
    val id: String = UUID.randomUUID().toString(),
    val state: TransferState = TransferState.PENDING,
    val error: String? = null,
)

// 転送待ちの一覧。アプリが終了しても続きから再開できるよう、変更のたびにファイルへ書く
class TransferQueue(private val file: File) {
    private val mutex = Mutex()
    private val state = MutableStateFlow(read())
    val items: StateFlow<List<Transfer>> = state

    fun next(): Transfer? = state.value.firstOrNull { it.state == TransferState.PENDING }

    suspend fun add(transfers: List<Transfer>) = change { it + transfers }

    suspend fun mark(id: String, newState: TransferState, error: String? = null) = change { list ->
        list.map { if (it.id == id) it.copy(state = newState, error = error) else it }
    }

    suspend fun retryFailed() = change { list ->
        list.map { if (it.state == TransferState.FAILED) it.copy(state = TransferState.PENDING, error = null) else it }
    }

    // 失敗したものは再試行できるように残す
    suspend fun clearFinished() = change { list ->
        list.filter { it.state == TransferState.PENDING || it.state == TransferState.FAILED }
    }

    suspend fun clearFailed() = change { list -> list.filter { it.state != TransferState.FAILED } }

    suspend fun clear() = change { emptyList() }

    private suspend fun change(transform: (List<Transfer>) -> List<Transfer>) = mutex.withLock {
        val updated = transform(state.value)
        state.value = updated
        withContext(Dispatchers.IO) {
            // 書いている途中で落ちても壊れたファイルを残さない
            val temp = File(file.path + ".tmp")
            temp.writeText(Json.encodeToString(updated))
            temp.renameTo(file)
        }
        Unit
    }

    private fun read(): List<Transfer> = try {
        if (file.exists()) Json.decodeFromString(file.readText()) else emptyList()
    } catch (_: Exception) {
        emptyList()
    }
}
