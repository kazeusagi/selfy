package io.github.kazeusagi.selfy

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import io.github.kazeusagi.selfy.ui.AlbumScreen
import io.github.kazeusagi.selfy.ui.AlbumsScreen
import io.github.kazeusagi.selfy.ui.ConnectScreen
import io.github.kazeusagi.selfy.ui.SelfyTheme
import io.github.kazeusagi.selfy.ui.SettingsScreen
import io.github.kazeusagi.selfy.ui.ViewerScreen

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        val app = application as SelfyApp
        setContent {
            SelfyTheme {
                val account by app.session.account.collectAsStateWithLifecycle()
                // ログインが切れたときも、ここが切り替わってログイン画面に戻る
                if (account == null) ConnectScreen(app) else Main(app)
            }
        }
    }
}

@Composable
private fun Main(app: SelfyApp) {
    val nav = rememberNavController()
    NavHost(nav, startDestination = "albums") {
        composable("albums") {
            AlbumsScreen(app, onOpen = { nav.navigate("album/$it") }, onSettings = { nav.navigate("settings") })
        }
        composable("album/{id}") { entry ->
            val id = entry.arguments?.getString("id").orEmpty()
            AlbumScreen(app, id, onBack = { nav.popBackStack() }, onView = { nav.navigate("viewer/$id/$it") })
        }
        composable("viewer/{id}/{index}") { entry ->
            val id = entry.arguments?.getString("id").orEmpty()
            val index = entry.arguments?.getString("index")?.toIntOrNull() ?: 0
            ViewerScreen(app, id, index, onBack = { nav.popBackStack() })
        }
        composable("settings") {
            SettingsScreen(app, onBack = { nav.popBackStack() })
        }
    }
}
