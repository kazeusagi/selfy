package io.github.kazeusagi.selfy.transfer

import android.content.Context
import io.github.kazeusagi.selfy.data.AlbumSummary
import kotlinx.serialization.Serializable
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

// 前に確認したときの、ほかの人が追加した写真の枚数と最後に追加された時刻
@Serializable
data class Seen(val count: Int, val latest: String?)

data class AlbumUpdate(val albumId: String, val message: String)

object AlbumDiff {
    fun seen(albums: List<AlbumSummary>): Map<String, Seen> =
        albums.associate { it.id to Seen(it.othersCount, it.othersLatestAt) }

    // 初めて確認するとき (before が null) は、今あるものを既読として何も知らせない
    fun updates(before: Map<String, Seen>?, albums: List<AlbumSummary>): List<AlbumUpdate> {
        if (before == null) return emptyList()
        return albums.mapNotNull { album ->
            val old = before[album.id]
            val latest = album.othersLatestAt
            when {
                old == null -> if (album.owned) null else AlbumUpdate(album.id, "「${album.title}」が共有されました")
                latest == null || (old.latest != null && latest <= old.latest) -> null
                else -> {
                    val added = album.othersCount - old.count
                    val count = if (added > 0) "${added}枚" else ""
                    AlbumUpdate(album.id, "「${album.title}」に写真が${count}追加されました")
                }
            }
        }
    }
}

// 共有アルバムに写真が増えたら通知する。サーバーからは知らせが来ないので、前回との差を端末で比べる
class AlbumWatcher(private val context: Context) {
    private val prefs = context.getSharedPreferences("albums", Context.MODE_PRIVATE)

    fun update(albums: List<AlbumSummary>, notify: Boolean) {
        val before = try {
            prefs.getString(SEEN, null)?.let { Json.decodeFromString<Map<String, Seen>>(it) }
        } catch (_: Exception) {
            null
        }
        if (notify) {
            AlbumDiff.updates(before, albums).forEach { Notifications.albumUpdate(context, it.albumId, it.message) }
        }
        prefs.edit().putString(SEEN, Json.encodeToString(AlbumDiff.seen(albums))).apply()
    }

    fun clear() = prefs.edit().clear().apply()

    private companion object {
        const val SEEN = "seen"
    }
}
