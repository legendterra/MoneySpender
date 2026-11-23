package net.moneyspender.android

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.rememberSaveable
import androidx.compose.runtime.setValue
import net.moneyspender.android.data.MoneySpenderRepository
import net.moneyspender.android.ui.MoneySpenderRoot
import net.moneyspender.android.ui.theme.MoneySpenderTheme
import net.moneyspender.android.viewmodel.MoneySpenderViewModel

class MainActivity : ComponentActivity() {
    private val repository by lazy { MoneySpenderRepository(applicationContext) }
    private val viewModel by lazy { MoneySpenderViewModel(repository) }
    private var deepLinkUrl by mutableStateOf<String?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        deepLinkUrl = intent?.dataString

        setContent {
            var darkModeEnabled by rememberSaveable { mutableStateOf(false) }

            MoneySpenderTheme(darkTheme = darkModeEnabled) {
                LaunchedEffect(deepLinkUrl) {
                    deepLinkUrl?.let { viewModel.handleIncomingUrl(it) }
                }

                MoneySpenderRoot(
                    viewModel = viewModel,
                    isDarkMode = darkModeEnabled,
                    onToggleTheme = { darkModeEnabled = !darkModeEnabled },
                )
            }
        }
    }

    override fun onNewIntent(intent: android.content.Intent) {
        super.onNewIntent(intent)
        deepLinkUrl = intent.dataString
    }
}
