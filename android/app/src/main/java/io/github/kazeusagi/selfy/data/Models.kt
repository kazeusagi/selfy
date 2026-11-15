package io.github.kazeusagi.selfy.data

import kotlinx.serialization.Serializable

@Serializable
data class ServerInfo(val app: String = "")

@Serializable
data class AlbumSummary(
    val id: String,
    val title: String,
    val count: Int = 0,
    val lastTakenAt: String? = null,
    val owned: Boolean = false,
    val canAdd: Boolean = false,
    val coverId: String? = null,
    val othersCount: Int = 0,
    val othersLatestAt: String? = null,
)

@Serializable
data class AlbumList(val albums: List<AlbumSummary>)

@Serializable
data class AlbumRef(val id: String, val title: String)

@Serializable
data class Photo(
    val id: String,
    val fileName: String,
    val takenAt: String,
    val width: Int,
    val height: Int,
    val originalBytes: Long = 0,
    val favorite: Boolean = false,
    val deletable: Boolean = false,
)

@Serializable
data class AlbumDetail(
    val album: AlbumRef,
    val role: String,
    val canAdd: Boolean,
    val photos: List<Photo>,
)

@Serializable
data class UserSettings(
    val keepOriginal: Boolean = true,
    val stripGps: Boolean = true,
    val wifiOnly: Boolean = false,
    val defaultExpiry: String = "7d",
)

@Serializable
data class Hashes(val hashes: List<String>)
