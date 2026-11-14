package io.github.kazeusagi.selfy.transfer

import android.content.Context
import android.graphics.Bitmap
import android.graphics.ImageDecoder
import android.net.Uri
import android.provider.MediaStore
import android.provider.OpenableColumns
import android.util.Size
import androidx.exifinterface.media.ExifInterface
import io.github.kazeusagi.selfy.data.PreparedUpload
import java.io.ByteArrayOutputStream
import java.io.FileNotFoundException
import java.security.MessageDigest
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import okhttp3.MediaType
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import okio.BufferedSink
import okio.source

// 端末の写真を、サーバーが受け取る形 (元画像・表示用・サムネイル・撮影情報) にする。
// サーバーは画像を変換しないので、Web 版がブラウザでしている処理をここで行う
class PhotoEncoder(context: Context) {
    private val resolver = context.contentResolver

    fun displayName(uri: Uri): String {
        val name = resolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { cursor ->
            if (cursor.moveToFirst()) cursor.getString(0) else null
        }
        return (name ?: "photo").take(255)
    }

    fun hash(uri: Uri): String {
        val digest = MessageDigest.getInstance("SHA-256")
        open(uri).use { stream ->
            val buffer = ByteArray(64 * 1024)
            while (true) {
                val read = stream.read(buffer)
                if (read < 0) break
                digest.update(buffer, 0, read)
            }
        }
        return digest.digest().joinToString("") { "%02x".format(it) }
    }

    fun prepare(uri: Uri, name: String, keepOriginal: Boolean, hash: String): PreparedUpload {
        val type = resolver.getType(uri)?.takeIf { it in PhotoRules.ORIGINAL_TYPES }
            ?: throw IllegalArgumentException("対応していない形式です")
        val exif = open(uri).use { ExifInterface(it) }

        // 元画像を縮めないなら表示用の大きさで読めば足りる。大きな写真をそのまま展開するとメモリが足りなくなる
        val maxEdge = if (keepOriginal) PhotoRules.DISPLAY_MAX_EDGE else PhotoRules.REDUCED_ORIGINAL_MAX_EDGE
        var sourceSize = Size(1, 1)
        val decoded = ImageDecoder.decodeBitmap(ImageDecoder.createSource(resolver, uri)) { decoder, info, _ ->
            sourceSize = info.size
            val (width, height) = PhotoRules.fitLongEdge(info.size.width, info.size.height, maxEdge)
            decoder.setTargetSize(width, height)
            // 縮小と書き出しは、GPU 上のビットマップではできない
            decoder.allocator = ImageDecoder.ALLOCATOR_SOFTWARE
        }

        try {
            // 読み込んだ画像は EXIF の向きが反映されている。ヘッダーの大きさが回転前なら入れ替える
            val rotated = (decoded.width >= decoded.height) != (sourceSize.width >= sourceSize.height)
            val fullWidth = if (rotated) sourceSize.height else sourceSize.width
            val fullHeight = if (rotated) sourceSize.width else sourceSize.height
            val reduce = !keepOriginal && maxOf(fullWidth, fullHeight) > PhotoRules.REDUCED_ORIGINAL_MAX_EDGE

            val display = resize(decoded, PhotoRules.fitLongEdge(decoded.width, decoded.height, PhotoRules.DISPLAY_MAX_EDGE))
            val thumb = resize(display, PhotoRules.fitShortEdge(display.width, display.height, PhotoRules.THUMB_MIN_EDGE))
            val displayBytes = encode(display)
            val thumbBytes = encode(thumb)
            if (thumb !== display) thumb.recycle()
            if (display !== decoded) display.recycle()

            val fileName = if (reduce) PhotoRules.withExtension(name, "webp") else name
            val original = if (reduce) encode(decoded).toRequestBody(WEBP) else UriBody(uri, type.toMediaType())
            val location = exif.latLong
            val meta = buildJsonObject {
                put("fileName", fileName)
                put("width", if (reduce) decoded.width else fullWidth)
                put("height", if (reduce) decoded.height else fullHeight)
                put("takenAt", PhotoRules.takenAt(exif.getAttribute(ExifInterface.TAG_DATETIME_ORIGINAL)) ?: fallbackDate(uri))
                put("latitude", location?.get(0))
                put("longitude", location?.get(1))
                put(
                    "camera",
                    PhotoRules.camera(exif.getAttribute(ExifInterface.TAG_MAKE), exif.getAttribute(ExifInterface.TAG_MODEL)),
                )
                put(
                    "exposure",
                    PhotoRules.exposure(
                        exif.getAttributeDouble(ExifInterface.TAG_F_NUMBER, 0.0),
                        exif.getAttributeDouble(ExifInterface.TAG_EXPOSURE_TIME, 0.0),
                        exif.getAttributeInt(ExifInterface.TAG_PHOTOGRAPHIC_SENSITIVITY, 0),
                    ),
                )
                put("contentHash", hash)
            }
            return PreparedUpload(fileName, original, displayBytes, thumbBytes, meta.toString())
        } finally {
            decoded.recycle()
        }
    }

    private fun open(uri: Uri) = resolver.openInputStream(uri) ?: throw FileNotFoundException(uri.toString())

    private fun resize(bitmap: Bitmap, size: Pair<Int, Int>): Bitmap =
        if (size.first == bitmap.width && size.second == bitmap.height) {
            bitmap
        } else {
            Bitmap.createScaledBitmap(bitmap, size.first, size.second, true)
        }

    private fun encode(bitmap: Bitmap): ByteArray {
        val stream = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.WEBP_LOSSY, PhotoRules.QUALITY, stream)
        return stream.toByteArray()
    }

    // 撮影日時が EXIF にない写真は、端末が持っている日時か、なければ今の時刻にする
    private fun fallbackDate(uri: Uri): String {
        val taken = try {
            resolver.query(uri, arrayOf(MediaStore.MediaColumns.DATE_TAKEN), null, null, null)?.use { cursor ->
                if (cursor.moveToFirst() && !cursor.isNull(0)) cursor.getLong(0) else null
            }
        } catch (_: Exception) {
            null
        }
        val date = Date(taken?.takeIf { it > 0 } ?: System.currentTimeMillis())
        return SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US).format(date)
    }

    // 元画像はメモリに載せず、送りながら読む
    private inner class UriBody(private val uri: Uri, private val type: MediaType) : RequestBody() {
        override fun contentType() = type

        override fun writeTo(sink: BufferedSink) {
            open(uri).source().use { sink.writeAll(it) }
        }
    }

    private companion object {
        val WEBP = "image/webp".toMediaType()
    }
}
