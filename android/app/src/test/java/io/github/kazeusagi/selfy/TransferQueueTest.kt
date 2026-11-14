package io.github.kazeusagi.selfy

import io.github.kazeusagi.selfy.transfer.Transfer
import io.github.kazeusagi.selfy.transfer.TransferQueue
import io.github.kazeusagi.selfy.transfer.TransferState
import java.io.File
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class TransferQueueTest {
    private val file = File.createTempFile("queue", ".json").apply { delete() }

    @Test
    fun 先頭から順に取り出し終わったものは飛ばす() = runBlocking {
        val queue = TransferQueue(file)
        queue.add(listOf(Transfer("album", "uri1", "a.jpg", id = "1"), Transfer("album", "uri2", "b.jpg", id = "2")))
        assertEquals("1", queue.next()?.id)
        queue.mark("1", TransferState.DONE)
        assertEquals("2", queue.next()?.id)
        queue.mark("2", TransferState.FAILED, "だめ")
        assertNull(queue.next())
    }

    @Test
    fun アプリを開き直しても残りが引き継がれる() = runBlocking {
        TransferQueue(file).add(listOf(Transfer("album", "uri1", "a.jpg", id = "1")))
        assertEquals(listOf("1"), TransferQueue(file).items.value.map { it.id })
    }

    @Test
    fun 失敗したものは片付けずに残して再試行できる() = runBlocking {
        val queue = TransferQueue(file)
        queue.add(listOf(Transfer("album", "uri1", "a.jpg", id = "1"), Transfer("album", "uri2", "b.jpg", id = "2")))
        queue.mark("1", TransferState.DONE)
        queue.mark("2", TransferState.FAILED, "だめ")
        queue.clearFinished()
        assertEquals(listOf("2"), queue.items.value.map { it.id })
        queue.retryFailed()
        assertEquals("2", queue.next()?.id)
    }
}
