package io.github.kazeusagi.selfy.data

import android.content.Context
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import okhttp3.Cookie
import okhttp3.CookieJar
import okhttp3.HttpUrl
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull

data class Account(val baseUrl: String, val email: String)

// 接続先とログイン状態を端末に残す。Selfy は各自がホストするので、接続先はアプリに埋め込まない
class Session(context: Context) : CookieJar {
    private val prefs = context.getSharedPreferences("session", Context.MODE_PRIVATE)

    @Volatile
    var baseUrl: String? = prefs.getString(BASE_URL, null)
        private set

    private val state = MutableStateFlow(
        prefs.getString(EMAIL, null)?.let { email -> baseUrl?.let { Account(it, email) } },
    )
    val account: StateFlow<Account?> = state

    var notifyAlbums: Boolean
        get() = prefs.getBoolean(NOTIFY_ALBUMS, true)
        set(value) = prefs.edit().putBoolean(NOTIFY_ALBUMS, value).apply()

    fun connect(url: String) {
        baseUrl = url
        prefs.edit().putString(BASE_URL, url).remove(COOKIES).apply()
    }

    fun signedIn(email: String) {
        val url = baseUrl ?: return
        prefs.edit().putString(EMAIL, email).apply()
        state.value = Account(url, email)
    }

    // 接続先は残す。ログインし直すときに入力を省けるようにするため
    fun signOut() {
        prefs.edit().remove(EMAIL).remove(COOKIES).apply()
        state.value = null
    }

    override fun saveFromResponse(url: HttpUrl, cookies: List<Cookie>) {
        if (cookies.isEmpty()) return
        val kept = stored().filter { old -> cookies.none { it.name == old.name } } + cookies
        val alive = kept.filter { it.expiresAt > System.currentTimeMillis() }
        prefs.edit().putStringSet(COOKIES, alive.map { it.toString() }.toSet()).apply()
    }

    override fun loadForRequest(url: HttpUrl): List<Cookie> =
        stored().filter { it.matches(url) && it.expiresAt > System.currentTimeMillis() }

    private fun stored(): List<Cookie> {
        val origin = baseUrl?.toHttpUrlOrNull() ?: return emptyList()
        return prefs.getStringSet(COOKIES, emptySet()).orEmpty().mapNotNull { Cookie.parse(origin, it) }
    }

    private companion object {
        const val BASE_URL = "baseUrl"
        const val EMAIL = "email"
        const val COOKIES = "cookies"
        const val NOTIFY_ALBUMS = "notifyAlbums"
    }
}
