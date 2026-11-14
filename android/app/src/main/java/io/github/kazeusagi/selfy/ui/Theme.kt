package io.github.kazeusagi.selfy.ui

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

// 色は Web 版のデザイントークン (design/README.md) に合わせる
private val Light = lightColorScheme(
    primary = Color(0xFF2747D6),
    onPrimary = Color.White,
    primaryContainer = Color(0xFFE3E8FB),
    onPrimaryContainer = Color(0xFF18181B),
    secondaryContainer = Color(0xFFF0EFEC),
    onSecondaryContainer = Color(0xFF18181B),
    background = Color(0xFFFAFAF9),
    onBackground = Color(0xFF18181B),
    surface = Color(0xFFFAFAF9),
    onSurface = Color(0xFF18181B),
    surfaceVariant = Color(0xFFF0EFEC),
    onSurfaceVariant = Color(0xFF52525B),
    surfaceContainerLowest = Color.White,
    surfaceContainerLow = Color.White,
    surfaceContainer = Color(0xFFF0EFEC),
    surfaceContainerHigh = Color.White,
    surfaceContainerHighest = Color(0xFFF0EFEC),
    outline = Color(0xFFD4D4D8),
    outlineVariant = Color(0xFFE4E4E7),
    error = Color(0xFFB42318),
)

private val Dark = darkColorScheme(
    primary = Color(0xFF3B5BF0),
    onPrimary = Color.White,
    primaryContainer = Color(0xFF232A4D),
    onPrimaryContainer = Color(0xFFF4F4F5),
    secondaryContainer = Color(0xFF232326),
    onSecondaryContainer = Color(0xFFF4F4F5),
    background = Color(0xFF0F0F10),
    onBackground = Color(0xFFF4F4F5),
    surface = Color(0xFF0F0F10),
    onSurface = Color(0xFFF4F4F5),
    surfaceVariant = Color(0xFF232326),
    onSurfaceVariant = Color(0xFFA1A1AA),
    surfaceContainerLowest = Color(0xFF1A1A1C),
    surfaceContainerLow = Color(0xFF1A1A1C),
    surfaceContainer = Color(0xFF232326),
    surfaceContainerHigh = Color(0xFF1C1C1F),
    surfaceContainerHighest = Color(0xFF232326),
    outline = Color(0xFF3A3A3F),
    outlineVariant = Color(0xFF2A2A2E),
    error = Color(0xFFFF8A80),
)

@Composable
fun SelfyTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = if (isSystemInDarkTheme()) Dark else Light, content = content)
}
