package io.github.kazeusagi.selfy

import io.github.kazeusagi.selfy.transfer.PhotoRules
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class PhotoRulesTest {
    @Test
    fun 長辺を上限に合わせて縮める() {
        assertEquals(2048 to 1536, PhotoRules.fitLongEdge(4000, 3000, 2048))
        assertEquals(1536 to 2048, PhotoRules.fitLongEdge(3000, 4000, 2048))
    }

    @Test
    fun 小さい写真は拡大しない() {
        assertEquals(800 to 600, PhotoRules.fitLongEdge(800, 600, 2048))
        assertEquals(400 to 300, PhotoRules.fitShortEdge(400, 300, 480))
    }

    @Test
    fun 短辺を下限に合わせて縮める() {
        assertEquals(640 to 480, PhotoRules.fitShortEdge(2048, 1536, 480))
    }

    @Test
    fun EXIFの日時をサーバーの形式にする() {
        assertEquals("2026-11-14T10:00:00", PhotoRules.takenAt("2026:11:14 10:00:00"))
        assertNull(PhotoRules.takenAt(null))
        assertNull(PhotoRules.takenAt("unknown"))
    }

    @Test
    fun カメラ名はメーカー名が重ならないようにつなぐ() {
        assertEquals("iPhone 17 Pro", PhotoRules.camera("Apple", "iPhone 17 Pro"))
        assertEquals("Canon EOS R5", PhotoRules.camera("Canon", "Canon EOS R5"))
        assertEquals("SONY ILCE-7M4", PhotoRules.camera("SONY", "ILCE-7M4"))
        assertNull(PhotoRules.camera(null, null))
    }

    @Test
    fun 露出をWeb版と同じ書式にする() {
        assertEquals("ƒ/1.8 · 1/125s · ISO 100", PhotoRules.exposure(1.8, 0.008, 100))
        assertEquals("ƒ/2 · 2s", PhotoRules.exposure(2.0, 2.0, 0))
        assertNull(PhotoRules.exposure(0.0, 0.0, 0))
    }

    @Test
    fun 縮小した元画像は拡張子を変える() {
        assertEquals("IMG_0001.webp", PhotoRules.withExtension("IMG_0001.HEIC", "webp"))
        assertEquals("photo.webp", PhotoRules.withExtension("photo", "webp"))
    }
}
