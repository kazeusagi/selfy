package io.github.kazeusagi.selfy.transfer

import java.math.BigDecimal
import java.math.RoundingMode
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

// Web 版 (src/lib/upload.ts) と同じ大きさ・書式にそろえる。どちらから追加しても同じ見え方にするため
object PhotoRules {
    const val DISPLAY_MAX_EDGE = 2048
    const val THUMB_MIN_EDGE = 480
    const val REDUCED_ORIGINAL_MAX_EDGE = 4000
    const val QUALITY = 85

    val ORIGINAL_TYPES = setOf(
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
        "image/avif",
        "image/heic",
        "image/heif",
    )

    private fun scaled(width: Int, height: Int, scale: Double): Pair<Int, Int> =
        max(1, (width * scale).roundToInt()) to max(1, (height * scale).roundToInt())

    fun fitLongEdge(width: Int, height: Int, maxEdge: Int): Pair<Int, Int> =
        scaled(width, height, min(1.0, maxEdge.toDouble() / max(width, height)))

    fun fitShortEdge(width: Int, height: Int, minEdge: Int): Pair<Int, Int> =
        scaled(width, height, min(1.0, minEdge.toDouble() / min(width, height)))

    // EXIF の "2026:11:14 10:00:00" を、サーバーが受け付ける "2026-11-14T10:00:00" にする
    fun takenAt(exifDateTime: String?): String? {
        val match = Regex("""^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})""").find(exifDateTime ?: return null)
            ?: return null
        val (year, month, day, hour, minute, second) = match.destructured
        return "$year-$month-${day}T$hour:$minute:$second"
    }

    fun camera(make: String?, model: String?): String? {
        val maker = make?.trim().orEmpty()
        val name = model?.trim().orEmpty()
        // "Apple" + "iPhone 17 Pro" のように Model にメーカー名がないものだけ連結する
        val camera = if (name.contains(maker, ignoreCase = true) || maker == "Apple") name else "$maker $name"
        return camera.trim().take(100).ifEmpty { null }
    }

    private fun number(value: Double): String =
        BigDecimal(value).setScale(2, RoundingMode.HALF_UP).stripTrailingZeros().toPlainString()

    fun exposure(fNumber: Double?, seconds: Double?, iso: Int?): String? {
        val settings = listOfNotNull(
            fNumber?.takeIf { it > 0 }?.let { "ƒ/${number(it)}" },
            seconds?.takeIf { it > 0 }?.let { if (it >= 1) "${number(it)}s" else "1/${(1 / it).roundToInt()}s" },
            iso?.takeIf { it > 0 }?.let { "ISO $it" },
        )
        return settings.joinToString(" · ").ifEmpty { null }
    }

    fun withExtension(fileName: String, extension: String): String =
        fileName.replace(Regex("""(\.[^.]+)?$"""), ".$extension")
}
