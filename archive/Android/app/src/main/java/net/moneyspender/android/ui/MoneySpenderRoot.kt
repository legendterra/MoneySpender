package net.moneyspender.android.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AccountBalanceWallet
import androidx.compose.material.icons.outlined.AccountCircle
import androidx.compose.material.icons.outlined.AddCircle
import androidx.compose.material.icons.outlined.ArrowBack
import androidx.compose.material.icons.outlined.ArrowForward
import androidx.compose.material.icons.outlined.BarChart
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Category
import androidx.compose.material.icons.outlined.DarkMode
import androidx.compose.material.icons.outlined.Email
import androidx.compose.material.icons.outlined.History
import androidx.compose.material.icons.outlined.Insights
import androidx.compose.material.icons.outlined.LightMode
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.Logout
import androidx.compose.material.icons.outlined.Payments
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.ReceiptLong
import androidx.compose.material.icons.outlined.Savings
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material.icons.outlined.TrendingDown
import androidx.compose.material.icons.outlined.TrendingUp
import androidx.compose.material.icons.outlined.WarningAmber
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.nestedscroll.NestedScrollConnection
import androidx.compose.ui.input.nestedscroll.NestedScrollSource
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import java.text.NumberFormat
import java.time.YearMonth
import java.time.format.TextStyle
import java.util.Locale
import net.moneyspender.android.data.Category
import net.moneyspender.android.data.DashboardSummary
import net.moneyspender.android.data.DebtRecord
import net.moneyspender.android.data.HistoryItem
import net.moneyspender.android.data.Profile
import net.moneyspender.android.data.TransactionRecord
import net.moneyspender.android.ui.components.AppBrandMark
import net.moneyspender.android.viewmodel.AppTab
import net.moneyspender.android.viewmodel.AuthTab
import net.moneyspender.android.viewmodel.MoneySpenderViewModel

private val IncomeColor = Color(0xFF12986D)
private val ExpenseColor = Color(0xFFE55A7D)
private val DebtColor = Color(0xFFF59E0B)
private val AccentColor = Color(0xFF4D84FF)
private val AccentStrongColor = Color(0xFF2451C8)
private val BreakdownPalette = listOf(
    AccentColor,
    Color(0xFF82A5FF),
    Color(0xFFA3C9FF),
    Color(0xFF5E9CFF),
)

private val tabs = listOf(
    TabItem(AppTab.Dashboard, "Dashboard", Icons.Outlined.BarChart),
    TabItem(AppTab.Income, "Masuk", Icons.Outlined.AddCircle),
    TabItem(AppTab.Expenses, "Keluar", Icons.Outlined.Payments),
    TabItem(AppTab.Debts, "Hutang", Icons.Outlined.WarningAmber),
    TabItem(AppTab.History, "Riwayat", Icons.Outlined.History),
    TabItem(AppTab.Settings, "Setting", Icons.Outlined.Settings),
)

private data class TabItem(
    val tab: AppTab,
    val label: String,
    val icon: ImageVector,
)

private data class TrendPoint(
    val label: String,
    val income: Double,
    val expense: Double,
)

private data class ExpenseSlice(
    val label: String,
    val total: Double,
    val ratio: Float,
    val color: Color,
)

@Composable
fun MoneySpenderRoot(
    viewModel: MoneySpenderViewModel,
    isDarkMode: Boolean,
    onToggleTheme: () -> Unit,
) {
    val state = viewModel.state
    val snackbar = remember { SnackbarHostState() }

    LaunchedEffect(state.message, state.error) {
        state.message?.let { snackbar.showSnackbar(it) }
        state.error?.let { snackbar.showSnackbar(it) }
        if (state.message != null || state.error != null) {
            viewModel.clearBanner()
        }
    }

    if (state.isLoading && state.snapshot == null && !state.isAuthenticated) {
        LoadingScreen()
        return
    }

    if (!state.isAuthenticated) {
        AuthScreen(
            viewModel = viewModel,
            snackbar = snackbar,
            isDarkMode = isDarkMode,
            onToggleTheme = onToggleTheme,
        )
        return
    }

    state.snapshot ?: run {
        LoadingScreen()
        return
    }

    AppScaffold(
        viewModel = viewModel,
        snackbar = snackbar,
        isDarkMode = isDarkMode,
        onToggleTheme = onToggleTheme,
    )
}

@Composable
private fun LoadingScreen() {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        MaterialTheme.colorScheme.background,
                        MaterialTheme.colorScheme.surfaceVariant,
                    ),
                ),
            ),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(18.dp),
        ) {
            AppBrandMark(modifier = Modifier.size(78.dp))
            CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    "Menyiapkan MoneySpender",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    "Dashboard native sedang diisi dengan data terbaru.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

@Composable
private fun AuthScreen(
    viewModel: MoneySpenderViewModel,
    snackbar: SnackbarHostState,
    isDarkMode: Boolean,
    onToggleTheme: () -> Unit,
) {
    val state = viewModel.state
    val context = LocalContext.current
    val authTabs = listOf(
        AuthTab.SignIn to "Login",
        AuthTab.SignUp to "Register",
        AuthTab.Reset to "Reset",
    )

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        snackbarHost = { SnackbarHost(snackbar) },
    ) { inner ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(inner)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = MaterialTheme.shapes.large,
                color = MaterialTheme.colorScheme.surface,
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.55f)),
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 12.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    AppBrandMark(modifier = Modifier.size(44.dp))
                    Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        Text(
                            "MoneySpender Mobile",
                            style = MaterialTheme.typography.titleLarge,
                            color = MaterialTheme.colorScheme.onSurface,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                        Text(
                            "Auth minimalis untuk layar Android",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    IconButton(onClick = onToggleTheme) {
                        Icon(
                            imageVector = if (isDarkMode) Icons.Outlined.LightMode else Icons.Outlined.DarkMode,
                            contentDescription = "Toggle theme",
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }

            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = MaterialTheme.shapes.large,
                color = MaterialTheme.colorScheme.surface,
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.55f)),
            ) {
                Column(
                    modifier = Modifier.padding(14.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Row(
                        modifier = Modifier.horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        authTabs.forEach { (tab, label) ->
                            FilterChip(
                                selected = state.authTab == tab,
                                onClick = { viewModel.setAuthTab(tab) },
                                label = { Text(label) },
                            )
                        }
                    }

                    Text(
                        text = when (state.authTab) {
                            AuthTab.SignIn -> "Masuk ke akun"
                            AuthTab.SignUp -> "Bikin akun baru"
                            AuthTab.Otp -> "Login kode email dinonaktifkan"
                            AuthTab.Reset -> "Atur ulang password"
                        },
                        style = MaterialTheme.typography.titleMedium,
                        color = MaterialTheme.colorScheme.onSurface,
                    )

                    when (state.authTab) {
                        AuthTab.SignIn -> {
                            AppTextField(
                                value = state.authForm.email,
                                onValueChange = { value ->
                                    viewModel.updateAuthForm { form -> form.copy(email = value) }
                                },
                                label = "Email",
                                leadingIcon = Icons.Outlined.Email,
                                keyboardType = KeyboardType.Email,
                            )
                            PasswordField(
                                value = state.authForm.password,
                                onValueChange = { value ->
                                    viewModel.updateAuthForm { form -> form.copy(password = value) }
                                },
                            )
                            Button(onClick = viewModel::signIn, modifier = Modifier.fillMaxWidth()) {
                                Text("Login")
                            }
                            TextButton(
                                onClick = { viewModel.setAuthTab(AuthTab.SignUp) },
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                Text("Register")
                            }
                        }

                        AuthTab.SignUp -> {
                            AppTextField(
                                value = state.authForm.email,
                                onValueChange = { value ->
                                    viewModel.updateAuthForm { form -> form.copy(email = value) }
                                },
                                label = "Email",
                                leadingIcon = Icons.Outlined.Email,
                                keyboardType = KeyboardType.Email,
                            )
                            AppTextField(
                                value = state.authForm.fullName,
                                onValueChange = { value ->
                                    viewModel.updateAuthForm { form -> form.copy(fullName = value) }
                                },
                                label = "Nama lengkap",
                                leadingIcon = Icons.Outlined.Person,
                            )
                            PasswordField(
                                value = state.authForm.password,
                                onValueChange = { value ->
                                    viewModel.updateAuthForm { form -> form.copy(password = value) }
                                },
                            )
                            Button(onClick = viewModel::signUp, modifier = Modifier.fillMaxWidth()) {
                                Text("Register")
                            }
                            TextButton(
                                onClick = { viewModel.setAuthTab(AuthTab.SignIn) },
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                Text("Kembali ke login")
                            }
                        }

                        AuthTab.Otp -> {
                            Text(
                                "Login kode email sudah disembunyikan agar alur auth lebih minimalis.",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            TextButton(
                                onClick = { viewModel.setAuthTab(AuthTab.SignIn) },
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                Text("Pakai login biasa")
                            }
                        }

                        AuthTab.Reset -> {
                            AppTextField(
                                value = state.authForm.email,
                                onValueChange = { value ->
                                    viewModel.updateAuthForm { form -> form.copy(email = value) }
                                },
                                label = "Email",
                                leadingIcon = Icons.Outlined.Email,
                                keyboardType = KeyboardType.Email,
                            )
                            PasswordField(
                                value = state.authForm.newPassword,
                                label = "Password baru",
                                onValueChange = { value ->
                                    viewModel.updateAuthForm { form -> form.copy(newPassword = value) }
                                },
                            )
                            OutlinedButton(
                                onClick = viewModel::sendResetEmail,
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                Text("Kirim email reset")
                            }
                            if (state.recoveryMode) {
                                Button(
                                    onClick = viewModel::completeRecovery,
                                    modifier = Modifier.fillMaxWidth(),
                                ) {
                                    Text("Simpan password baru")
                                }
                            }
                            TextButton(
                                onClick = { viewModel.setAuthTab(AuthTab.SignIn) },
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                Text("Kembali ke login")
                            }
                        }
                    }

                    if (state.authTab == AuthTab.SignIn) {
                        OutlinedButton(
                            onClick = { context.startActivity(viewModel.createGoogleIntent()) },
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Text("Login dengan Google")
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun PasswordField(
    value: String,
    label: String = "Password",
    onValueChange: (String) -> Unit,
) {
    AppTextField(
        value = value,
        onValueChange = onValueChange,
        label = label,
        leadingIcon = Icons.Outlined.Lock,
        keyboardType = KeyboardType.Password,
        imeAction = ImeAction.Done,
        visualTransformation = PasswordVisualTransformation(),
    )
}

@Composable
private fun AppScaffold(
    viewModel: MoneySpenderViewModel,
    snackbar: SnackbarHostState,
    isDarkMode: Boolean,
    onToggleTheme: () -> Unit,
) {
    val state = viewModel.state
    val snapshot = state.snapshot ?: return
    var isTopBarVisible by remember { mutableStateOf(true) }

    LaunchedEffect(state.selectedTab) {
        isTopBarVisible = true
    }

    val scrollAwareConnection = remember {
        object : NestedScrollConnection {
            override fun onPreScroll(available: Offset, source: NestedScrollSource): Offset {
                if (source == NestedScrollSource.UserInput) {
                    when {
                        available.y < -2f && isTopBarVisible -> isTopBarVisible = false
                        available.y > 2f && !isTopBarVisible -> isTopBarVisible = true
                    }
                }
                return Offset.Zero
            }
        }
    }

    Scaffold(
        modifier = Modifier.nestedScroll(scrollAwareConnection),
        containerColor = MaterialTheme.colorScheme.background,
        snackbarHost = { SnackbarHost(snackbar) },
        topBar = {
            AnimatedVisibility(
                visible = isTopBarVisible,
                enter = slideInVertically(initialOffsetY = { -it / 2 }) + fadeIn(),
                exit = slideOutVertically(targetOffsetY = { -it }) + fadeOut(),
            ) {
                MoneySpenderTopBar(
                    title = currentTitle(state.selectedTab),
                    subtitle = screenSubtitle(state.selectedTab),
                    profile = snapshot.profile,
                    userEmail = snapshot.user.email.orEmpty(),
                    isDarkMode = isDarkMode,
                    onToggleTheme = onToggleTheme,
                )
            }
        },
        bottomBar = {
            MoneySpenderBottomBar(
                selectedTab = state.selectedTab,
                onSelect = viewModel::setTab,
            )
        },
    ) { inner ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(inner),
        ) {
            when (state.selectedTab) {
                AppTab.Dashboard -> DashboardScreen(
                    modifier = Modifier.fillMaxSize(),
                    selectedMonth = state.selectedMonth,
                    userEmail = snapshot.user.email.orEmpty(),
                    profile = snapshot.profile,
                    dashboard = snapshot.dashboard,
                    transactions = snapshot.transactions,
                    onMonthChange = viewModel::setMonth,
                    onQuickAction = viewModel::setTab,
                )

                AppTab.Income -> TransactionsScreen(
                    modifier = Modifier.fillMaxSize(),
                    title = "Pemasukan",
                    subtitle = "Catat pemasukan tanpa harus pindah ke desktop.",
                    categories = snapshot.categories.filter { it.type == "income" },
                    draft = state.incomeDraft,
                    records = snapshot.transactions.filter {
                        it.type == "income" && it.transactionDate.startsWith(state.selectedMonth)
                    },
                    accentColor = IncomeColor,
                    onDraftChange = viewModel::updateIncomeDraft,
                    onSave = { viewModel.saveTransaction("income") },
                    onDelete = viewModel::deleteTransaction,
                )

                AppTab.Expenses -> TransactionsScreen(
                    modifier = Modifier.fillMaxSize(),
                    title = "Pengeluaran",
                    subtitle = "Form lebih ringkas, kategori tinggal tap, dan histori tetap gampang discan.",
                    categories = snapshot.categories.filter { it.type == "expense" },
                    draft = state.expenseDraft,
                    records = snapshot.transactions.filter {
                        it.type == "expense" && it.transactionDate.startsWith(state.selectedMonth)
                    },
                    accentColor = ExpenseColor,
                    onDraftChange = viewModel::updateExpenseDraft,
                    onSave = { viewModel.saveTransaction("expense") },
                    onDelete = viewModel::deleteTransaction,
                )

                AppTab.Debts -> DebtScreen(
                    modifier = Modifier.fillMaxSize(),
                    draft = state.debtDraft,
                    debts = snapshot.debts.filter { it.debtDate.startsWith(state.selectedMonth) },
                    currencyCode = snapshot.profile.currencyCode,
                    onDraftChange = viewModel::updateDebtDraft,
                    onSave = viewModel::saveDebt,
                    onMarkPaid = viewModel::markDebtPaid,
                )

                AppTab.History -> HistoryScreen(
                    modifier = Modifier.fillMaxSize(),
                    items = state.historyItems,
                    filter = state.historyFilter,
                    currencyCode = snapshot.profile.currencyCode,
                    onFilterChange = viewModel::updateHistoryFilter,
                    onApplyFilter = viewModel::applyHistoryFilter,
                )

                AppTab.Settings -> SettingsScreen(
                    modifier = Modifier.fillMaxSize(),
                    snapshot = snapshot,
                    profileDraft = state.profileDraft,
                    categoryName = state.categoryDraft.name,
                    categoryType = state.categoryDraft.type,
                    recoveryMode = state.recoveryMode,
                    recoveryPassword = state.authForm.newPassword,
                    onProfileChange = viewModel::updateProfileDraft,
                    onSaveProfile = viewModel::saveProfile,
                    onReminderChange = { morning, evening, push ->
                        viewModel.toggleReminder(snapshot.reminder, morning, evening, push)
                    },
                    onCategoryNameChange = { value -> viewModel.updateCategoryDraft { it.copy(name = value) } },
                    onCategoryTypeChange = { value -> viewModel.updateCategoryDraft { it.copy(type = value) } },
                    onAddCategory = viewModel::addCategory,
                    onDeleteCategory = viewModel::deleteCategory,
                    onRecoveryPasswordChange = { value ->
                        viewModel.updateAuthForm { form -> form.copy(newPassword = value) }
                    },
                    onCompleteRecovery = viewModel::completeRecovery,
                    onLogout = viewModel::logout,
                )
            }

            if (state.isLoading) {
                LinearProgressIndicator(
                    modifier = Modifier
                        .fillMaxWidth()
                        .align(Alignment.TopCenter),
                )
            }
        }
    }
}
