package io.github.kazeusagi.selfy

import io.github.kazeusagi.selfy.data.AlbumSummary
import io.github.kazeusagi.selfy.transfer.AlbumDiff
import io.github.kazeusagi.selfy.transfer.Seen
import org.junit.Assert.assertEquals
import org.junit.Test

class AlbumDiffTest {
    private fun album(count: Int, latest: String?, owned: Boolean = true) =
        AlbumSummary(id = "a", title = "旅行", owned = owned, othersCount = count, othersLatestAt = latest)

    @Test
    fun 初回は何も知らせない() {
        assertEquals(emptyList<Any>(), AlbumDiff.updates(null, listOf(album(3, "2026-11-14 10:00:00"))))
    }

    @Test
    fun ほかの人が追加した枚数を知らせる() {
        val before = mapOf("a" to Seen(1, "2026-11-13 10:00:00"))
        val updates = AlbumDiff.updates(before, listOf(album(3, "2026-11-14 10:00:00")))
        assertEquals(listOf("「旅行」に写真が2枚追加されました"), updates.map { it.message })
    }

    @Test
    fun 変わっていなければ知らせない() {
        val before = mapOf("a" to Seen(3, "2026-11-14 10:00:00"))
        assertEquals(emptyList<Any>(), AlbumDiff.updates(before, listOf(album(3, "2026-11-14 10:00:00"))))
    }

    @Test
    fun 削除と追加が重なって枚数が増えていなくても知らせる() {
        val before = mapOf("a" to Seen(3, "2026-11-13 10:00:00"))
        val updates = AlbumDiff.updates(before, listOf(album(3, "2026-11-14 10:00:00")))
        assertEquals(listOf("「旅行」に写真が追加されました"), updates.map { it.message })
    }

    @Test
    fun 新しく招待されたアルバムを知らせる() {
        val updates = AlbumDiff.updates(emptyMap(), listOf(album(0, null, owned = false)))
        assertEquals(listOf("「旅行」が共有されました"), updates.map { it.message })
    }

    @Test
    fun 自分で作ったアルバムは知らせない() {
        assertEquals(emptyList<Any>(), AlbumDiff.updates(emptyMap(), listOf(album(0, null))))
    }
}
