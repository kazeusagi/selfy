package io.github.kazeusagi.selfy.data

import java.io.IOException
import java.io.InputStream
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.SerializationException
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody
import okhttp3.RequestBody.Companion.toRequestBody

// サーバーが返したエラー。通信そのものの失敗 (IOException) と分けて、再試行するかどうかを決める
class ApiException(val status: Int, message: String) : Exception(message)

class PreparedUpload(
    val fileName: String,
    val original: RequestBody,
    val display: ByteArray,
    val thumb: ByteArray,
    val meta: String,
)

fun Throwable.userMessage(): String = when (this) {
    is ApiException -> message ?: "エラーが発生しました"
    is IOException -> "通信できませんでした。接続を確認してください"
    else -> "エラーが発生しました"
}

class Api(private val session: Session) {
    private val json = Json { ignoreUnknownKeys = true }

    val client: OkHttpClient = OkHttpClient.Builder()
        .cookieJar(session)
        .addInterceptor { chain ->
            // Better Auth は Origin のない書き込みを拒否するので、接続先と同じ Origin を名乗る
            val origin = chain.request().url.newBuilder().encodedPath("/").query(null).build().toString().trimEnd('/')
            chain.proceed(chain.request().newBuilder().header("Origin", origin).build())
        }
        .readTimeout(60, TimeUnit.SECONDS)
        // 元画像は数十 MB になるので、遅い回線でも途中で切られないようにする
        .writeTimeout(5, TimeUnit.MINUTES)
        .build()

    private fun url(path: String): String =
        (session.baseUrl ?: throw ApiException(0, "接続先が設定されていません")) + path

    private fun errorMessage(body: String, status: Int): String {
        val message = try {
            json.parseToJsonElement(body).jsonObject["message"]?.jsonPrimitive?.content
        } catch (_: Exception) {
            null
        }
        return message?.takeIf { it.isNotBlank() } ?: "エラーが発生しました（$status）"
    }

    private suspend fun call(request: Request): String = withContext(Dispatchers.IO) {
        client.newCall(request).execute().use { response ->
            val body = response.body?.string().orEmpty()
            if (!response.isSuccessful) {
                // ログインが切れたらログイン画面に戻す
                if (response.code == 401) session.signOut()
                throw ApiException(response.code, errorMessage(body, response.code))
            }
            body
        }
    }

    private suspend inline fun <reified T> get(path: String): T =
        json.decodeFromString(call(Request.Builder().url(url(path)).build()))

    private suspend fun send(method: String, path: String, body: JsonObject): String =
        call(Request.Builder().url(url(path)).method(method, body.toString().toRequestBody(JSON)).build())

    // 入力されたドメインが Selfy のサーバーか確かめてから接続先にする
    suspend fun connect(input: String) {
        val host = input.trim().removePrefix("https://").removePrefix("http://").trimEnd('/')
        val base = "https://$host"
        if (host.isEmpty() || base.toHttpUrlOrNull() == null) throw ApiException(0, "ドメインの形式が正しくありません")
        val info = try {
            json.decodeFromString<ServerInfo>(call(Request.Builder().url("$base/api/info").build()))
        } catch (_: ApiException) {
            null
        } catch (_: SerializationException) {
            null
        }
        if (info?.app != "selfy") {
            throw ApiException(0, "Selfy のサーバーが見つかりませんでした。ドメインと、サーバーが最新版かを確認してください")
        }
        session.connect(base)
    }

    suspend fun sendCode(email: String) {
        send("POST", "/api/auth/email-otp/send-verification-otp", buildJsonObject {
            put("email", email)
            put("type", "sign-in")
        })
    }

    suspend fun signIn(email: String, code: String) {
        send("POST", "/api/auth/sign-in/email-otp", buildJsonObject {
            put("email", email)
            put("otp", code)
        })
        session.signedIn(email)
    }

    suspend fun signOut() {
        try {
            send("POST", "/api/auth/sign-out", JsonObject(emptyMap()))
        } catch (_: Exception) {
            // サーバーに届かなくても、端末側のログイン状態は消す
        }
        session.signOut()
    }

    suspend fun albums(): List<AlbumSummary> = get<AlbumList>("/api/albums").albums

    suspend fun album(id: String): AlbumDetail = get("/api/albums/$id")

    suspend fun createAlbum(title: String) {
        send("POST", "/api/albums", buildJsonObject { put("title", title) })
    }

    suspend fun settings(): UserSettings = get("/api/settings")

    suspend fun updateSettings(change: JsonObject) {
        send("PATCH", "/api/settings", change)
    }

    suspend fun setFavorite(photoId: String, favorite: Boolean) {
        send("PATCH", "/api/photos/$photoId", buildJsonObject { put("favorite", favorite) })
    }

    suspend fun deletePhoto(photoId: String) {
        call(Request.Builder().url(url("/api/photos/$photoId")).delete().build())
    }

    suspend fun existingHashes(albumId: String): Set<String> =
        get<Hashes>("/api/albums/$albumId/photos").hashes.toSet()

    // 追加済みだった場合は false を返す
    suspend fun uploadPhoto(albumId: String, upload: PreparedUpload): Boolean {
        val body = MultipartBody.Builder()
            .setType(MultipartBody.FORM)
            .addFormDataPart("original", upload.fileName, upload.original)
            .addFormDataPart("display", "display.webp", upload.display.toRequestBody(WEBP))
            .addFormDataPart("thumb", "thumb.webp", upload.thumb.toRequestBody(WEBP))
            .addFormDataPart("meta", upload.meta)
            .build()
        return try {
            call(Request.Builder().url(url("/api/albums/$albumId/photos")).post(body).build())
            true
        } catch (e: ApiException) {
            if (e.status != 409) throw e
            false
        }
    }

    suspend fun <T> downloadOriginal(photoId: String, save: (contentType: String?, stream: InputStream) -> T): T =
        withContext(Dispatchers.IO) {
            val request = Request.Builder().url(url("/api/photos/$photoId/original")).build()
            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) {
                    if (response.code == 401) session.signOut()
                    throw ApiException(response.code, "写真を取得できませんでした（${response.code}）")
                }
                val body = response.body ?: throw IOException("empty body")
                save(body.contentType()?.let { "${it.type}/${it.subtype}" }, body.byteStream())
            }
        }

    fun photoUrl(photoId: String, variant: String): String = "${session.baseUrl}/api/photos/$photoId/$variant"

    private companion object {
        val JSON = "application/json".toMediaType()
        val WEBP = "image/webp".toMediaType()
    }
}
