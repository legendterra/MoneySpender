package net.moneyspender.android.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AddCircle
import androidx.compose.material.icons.outlined.BarChart
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Category
import androidx.compose.material.icons.outlined.History
import androidx.compose.material.icons.outlined.Insights
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.Logout
import androidx.compose.material.icons.outlined.Payments
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.ReceiptLong
import androidx.compose.material.icons.outlined.Savings
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material.icons.outlined.WarningAmber
import androidx.compose.material3.Button
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import java.text.NumberFormat
import java.time.Instant
import java.time.LocalDate
import java.time.YearMonth
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.format.TextStyle
import java.util.Currency
import java.util.Locale
import net.moneyspender.android.data.Category
import net.moneyspender.android.data.Profile
import net.moneyspender.android.ui.components.AppBrandMark
import net.moneyspender.android.viewmodel.AppTab

val DashboardAccent = Color(0xFF4D84FF)
val DashboardAccentStrong = Color(0xFF2451C8)
val DashboardIncome = Color(0xFF12986D)
val DashboardExpense = Color(0xFFE55A7D)
val DashboardDebt = Color(0xFFF59E0B)
val DashboardBreakdownPalette = listOf(
    DashboardAccent,
    Color(0xFF82A5FF),
    Color(0xFFA3C9FF),
    Color(0xFF7CC5D8),
)

private data class DashboardTabItem(
    val tab: AppTab,
    val label: String,
    val icon: ImageVector,
)

private val bottomTabs = listOf(
    DashboardTabItem(AppTab.Dashboard, "Dashboard", Icons.Outlined.BarChart),
    DashboardTabItem(AppTab.Income, "Masuk", Icons.Outlined.AddCircle),
    DashboardTabItem(AppTab.Expenses, "Keluar", Icons.Outlined.Payments),
    DashboardTabItem(AppTab.Debts, "Hutang", Icons.Outlined.WarningAmber),
    DashboardTabItem(AppTab.History, "Riwayat", Icons.Outlined.History),
    DashboardTabItem(AppTab.Settings, "Setting", Icons.Outlined.Settings),
)

val weekdayChips = listOf(
    "all" to "Semua",
    "1" to "Sen",
    "2" to "Sel",
    "3" to "Rab",
    "4" to "Kam",
    "5" to "Jum",
    "6" to "Sab",
    "0" to "Min",
)

private val dateDisplayFormatter: DateTimeFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy")
private val dateInputFormatter: DateTimeFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy")

@Composable
fun AppPanel(
    modifier: Modifier = Modifier,
    content: @Composable ColumnScope.() -> Unit,
) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = MaterialTheme.shapes.large,
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.24f)),
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
            content = content,
        )
    }
}

@Composable
fun SectionHeading(
    title: String,
    subtitle: String,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(
            text = title,
            style = MaterialTheme.typography.titleLarge,
            color = MaterialTheme.colorScheme.onSurface,
        )
        Text(
            text = subtitle,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
fun AppTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    leadingIcon: ImageVector,
    modifier: Modifier = Modifier,
    keyboardType: KeyboardType = KeyboardType.Text,
    imeAction: ImeAction = ImeAction.Next,
    visualTransformation: VisualTransformation = VisualTransformation.None,
    singleLine: Boolean = true,
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        modifier = modifier.fillMaxWidth(),
        label = { Text(label) },
        singleLine = singleLine,
        leadingIcon = {
            Icon(
                imageVector = leadingIcon,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
            )
        },
        keyboardOptions = KeyboardOptions(
            keyboardType = keyboardType,
            imeAction = imeAction,
        ),
        visualTransformation = visualTransformation,
        maxLines = if (singleLine) 1 else 4,
        shape = MaterialTheme.shapes.medium,
    )
}

@Composable
fun MoneySpenderTopBar(
    title: String,
    subtitle: String,
    profile: Profile,
    userEmail: String,
) {
    Surface(
        color = MaterialTheme.colorScheme.background,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Box(
            modifier = Modifier
                .statusBarsPadding()
                .padding(horizontal = 16.dp, vertical = 12.dp)
                .clip(MaterialTheme.shapes.large)
                .background(
                    brush = Brush.linearGradient(
                        colors = listOf(
                            DashboardAccentStrong,
                            DashboardAccent,
                            MaterialTheme.colorScheme.surfaceVariant,
                        ),
                    ),
                )
                .border(
                    width = 1.dp,
                    color = Color.White.copy(alpha = 0.18f),
                    shape = MaterialTheme.shapes.large,
                )
                .padding(18.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(14.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                AppBrandMark(modifier = Modifier.size(54.dp))
                Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(
                        text = title,
                        style = MaterialTheme.typography.headlineSmall,
                        color = Color.White,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Text(
                        text = subtitle,
                        style = MaterialTheme.typography.bodyMedium,
                        color = Color.White.copy(alpha = 0.88f),
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Text(
                        text = userEmail.ifBlank { profile.fullName ?: "Pengguna MoneySpender" },
                        style = MaterialTheme.typography.bodySmall,
                        color = Color.White.copy(alpha = 0.8f),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                Surface(shape = CircleShape, color = Color.White.copy(alpha = 0.18f)) {
                    Text(
                        text = profile.currencyCode.uppercase(Locale.ROOT),
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                        style = MaterialTheme.typography.labelLarge,
                        color = Color.White,
                    )
                }
            }
        }
    }
}

@Composable
fun MoneySpenderBottomBar(
    selectedTab: AppTab,
    onSelect: (AppTab) -> Unit,
) {
    Surface(
        modifier = Modifier.padding(horizontal = 10.dp, vertical = 8.dp),
        shape = RoundedCornerShape(28.dp),
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.22f)),
        tonalElevation = 4.dp,
        shadowElevation = 2.dp,
    ) {
        NavigationBar(
            modifier = Modifier.fillMaxWidth(),
            containerColor = Color.Transparent,
            tonalElevation = 0.dp,
        ) {
            bottomTabs.forEach { item ->
                NavigationBarItem(
                    selected = selectedTab == item.tab,
                    onClick = { onSelect(item.tab) },
                    icon = { Icon(imageVector = item.icon, contentDescription = item.label) },
                    label = { Text(item.label) },
                    alwaysShowLabel = false,
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = Color.White,
                        selectedTextColor = DashboardAccentStrong,
                        indicatorColor = DashboardAccent,
                        unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                        unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant,
                    ),
                )
            }
        }
    }
}

@Composable
fun SettingToggleRow(
    title: String,
    subtitle: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
) {
    Surface(
        shape = MaterialTheme.shapes.medium,
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.44f),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(title, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
                Text(subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Switch(checked = checked, onCheckedChange = onCheckedChange)
        }
    }
}

@Composable
fun EmptyState(message: String) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(MaterialTheme.shapes.medium)
            .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
            .padding(16.dp),
    ) {
        Text(
            text = message,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

fun formatMonth(month: YearMonth): String {
    val monthLabel = month.month.getDisplayName(TextStyle.FULL, Locale("id", "ID"))
    return "${monthLabel.replaceFirstChar { it.titlecase(Locale("id", "ID")) }} ${month.year}"
}

fun formatCurrency(amount: Double, currencyCode: String): String {
    val formatter = NumberFormat.getCurrencyInstance(Locale("id", "ID")).apply {
        maximumFractionDigits = if (currencyCode.equals("IDR", ignoreCase = true)) 0 else 2
        minimumFractionDigits = if (currencyCode.equals("IDR", ignoreCase = true)) 0 else 2
        currency = runCatching { Currency.getInstance(currencyCode.uppercase(Locale.ROOT)) }.getOrNull()
    }
    return runCatching { formatter.format(amount) }.getOrElse { "${currencyCode.uppercase(Locale.ROOT)} $amount" }
}

fun formatDisplayDate(value: String): String {
    val normalized = value.trim()
    if (normalized.isBlank()) {
        return value
    }

    val parsedDate = runCatching { LocalDate.parse(normalized, DateTimeFormatter.ISO_LOCAL_DATE) }.getOrNull()
        ?: runCatching { LocalDate.parse(normalized, dateInputFormatter) }.getOrNull()
        ?: runCatching { Instant.parse(normalized).atZone(ZoneId.systemDefault()).toLocalDate() }.getOrNull()

    return parsedDate?.format(dateDisplayFormatter) ?: value
}

fun colorFromHex(value: String?): Color {
    if (value.isNullOrBlank()) {
        return DashboardAccent
    }
    return runCatching { Color(android.graphics.Color.parseColor(value)) }.getOrDefault(DashboardAccent)
}

@Composable
fun CategoryRow(
    category: Category,
    onDelete: (String) -> Unit,
) {
    Surface(
        shape = MaterialTheme.shapes.medium,
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.44f),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier
                    .size(12.dp)
                    .clip(CircleShape)
                    .background(colorFromHex(category.color)),
            )
            Column(modifier = Modifier.weight(1f)) {
                Text(category.name, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
                Text(
                    text = when (category.type) {
                        "income" -> "Kategori pemasukan"
                        "debt" -> "Kategori hutang"
                        else -> "Kategori pengeluaran"
                    },
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            TextButton(onClick = { onDelete(category.id) }) {
                Text("Hapus")
            }
        }
    }
}
