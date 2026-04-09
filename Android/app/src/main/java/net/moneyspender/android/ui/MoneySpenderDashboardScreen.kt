package net.moneyspender.android.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.ArrowBack
import androidx.compose.material.icons.outlined.ArrowForward
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import java.time.YearMonth
import java.time.format.TextStyle
import java.util.Locale
import kotlin.math.max
import net.moneyspender.android.data.DashboardSummary
import net.moneyspender.android.data.DebtRecord
import net.moneyspender.android.data.Profile
import net.moneyspender.android.data.TransactionRecord
import net.moneyspender.android.viewmodel.AppTab

private data class MonthTrend(
    val label: String,
    val income: Double,
    val expense: Double,
)

private data class ExpenseBreakdown(
    val label: String,
    val total: Double,
    val ratio: Float,
    val color: Color,
)

@Composable
fun DashboardScreen(
    modifier: Modifier = Modifier,
    selectedMonth: String,
    userEmail: String,
    profile: Profile,
    dashboard: DashboardSummary,
    transactions: List<TransactionRecord>,
    onMonthChange: (String) -> Unit,
    onQuickAction: (AppTab) -> Unit,
) {
    val activeMonth = runCatching { YearMonth.parse(selectedMonth) }.getOrDefault(YearMonth.now())
    val currentMonthTransactions = transactions.filter { it.transactionDate.startsWith(activeMonth.toString()) }
    val availableMonths = List(6) { index -> activeMonth.minusMonths((5 - index).toLong()) }
    val trend = availableMonths.map { month ->
        val monthTransactions = transactions.filter { it.transactionDate.startsWith(month.toString()) }
        MonthTrend(
            label = month.month.getDisplayName(TextStyle.SHORT, Locale("id", "ID")),
            income = monthTransactions.filter { it.type == "income" }.sumOf { it.amount },
            expense = monthTransactions.filter { it.type == "expense" }.sumOf { it.amount },
        )
    }
    val expenseTotal = currentMonthTransactions.filter { it.type == "expense" }.sumOf { it.amount }
    val breakdown = currentMonthTransactions
        .filter { it.type == "expense" }
        .groupBy { it.categoryLabel ?: "Tanpa kategori" }
        .entries
        .toList()
        .mapIndexed { index, entry ->
            val total = entry.value.sumOf { it.amount }
            ExpenseBreakdown(
                label = entry.key,
                total = total,
                ratio = if (expenseTotal == 0.0) 0f else (total / expenseTotal).toFloat().coerceIn(0f, 1f),
                color = DashboardBreakdownPalette[index % DashboardBreakdownPalette.size],
            )
        }
        .sortedByDescending { it.total }
        .take(4)

    val summaryCards = listOf(
        Triple("Pemasukan", formatCurrency(dashboard.income, profile.currencyCode), DashboardIncome),
        Triple("Pengeluaran", formatCurrency(dashboard.expense, profile.currencyCode), DashboardExpense),
        Triple("Saldo bulan ini", formatCurrency(dashboard.balance, profile.currencyCode), DashboardAccent),
        Triple("Rasio nabung", "${dashboard.savingsRate}%", DashboardAccentStrong),
        Triple("Total hutang", formatCurrency(dashboard.totalOutstandingDebt, profile.currencyCode), DashboardDebt),
        Triple("Goal bulanan", formatCurrency(dashboard.monthlyGoal, profile.currencyCode), DashboardAccent),
    )

    LazyColumn(
        modifier = modifier,
        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item {
            DashboardHero(
                activeMonth = activeMonth,
                profile = profile,
                userEmail = userEmail,
                availableMonths = availableMonths,
                onMonthChange = onMonthChange,
                onQuickAction = onQuickAction,
            )
        }

        item {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                summaryCards.chunked(2).forEach { row ->
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        row.forEach { item ->
                            MetricCard(
                                modifier = Modifier.weight(1f),
                                title = item.first,
                                value = item.second,
                                tone = item.third,
                            )
                        }
                        if (row.size == 1) {
                            Spacer(modifier = Modifier.weight(1f))
                        }
                    }
                }
            }
        }

        item {
            AppPanel {
                SectionHeading(
                    title = "Tren cashflow 6 bulan",
                    subtitle = "Pola pemasukan dan pengeluaran dibikin lebih gampang dipindai sekilas.",
                )
                TrendChart(points = trend)
            }
        }

        item {
            AppPanel {
                SectionHeading(
                    title = "Mood bulan ini",
                    subtitle = "Kondisi utama keuangan disusun seperti ringkasan cepat versi web.",
                )
                SummaryBadgeRow(
                    firstLabel = "Target tahunan",
                    firstValue = formatCurrency(dashboard.yearlyGoal, profile.currencyCode),
                    secondLabel = "Sisa tahun ini",
                    secondValue = formatCurrency(dashboard.yearBalance, profile.currencyCode),
                )
                SummaryBadgeRow(
                    firstLabel = "Hutang aktif",
                    firstValue = dashboard.unpaidDebtCount.toString(),
                    secondLabel = "Email akun",
                    secondValue = userEmail.ifBlank { profile.fullName ?: "-" },
                )
            }
        }

        item {
            AppPanel {
                SectionHeading(
                    title = "Komposisi pengeluaran",
                    subtitle = "Kategori terbesar bulan ini langsung kelihatan tanpa grafik berat.",
                )
                if (breakdown.isEmpty()) {
                    EmptyState("Belum ada pengeluaran di bulan ini, jadi komposisi kategori masih kosong.")
                } else {
                    breakdown.forEach { slice ->
                        BreakdownRow(
                            label = slice.label,
                            value = formatCurrency(slice.total, profile.currencyCode),
                            ratio = slice.ratio,
                            color = slice.color,
                        )
                    }
                }
            }
        }

        item {
            AppPanel {
                SectionHeading(
                    title = "Top transaksi",
                    subtitle = "Nominal terbesar dipecah supaya keputusan harian lebih cepat.",
                )
                DashboardRecordGroup("Pemasukan terbesar", dashboard.topIncome, profile.currencyCode, DashboardIncome)
                DashboardRecordGroup("Pengeluaran terbesar", dashboard.topExpense, profile.currencyCode, DashboardExpense)
            }
        }

        item {
            AppPanel {
                SectionHeading(
                    title = "Hutang yang perlu fokus",
                    subtitle = "Catatan paling penting ditaruh dekat dashboard agar follow-up tidak terlewat.",
                )
                DashboardDebtGroup(debts = dashboard.recentDebts, currencyCode = profile.currencyCode)
            }
        }
    }
}

@Composable
private fun DashboardHero(
    activeMonth: YearMonth,
    profile: Profile,
    userEmail: String,
    availableMonths: List<YearMonth>,
    onMonthChange: (String) -> Unit,
    onQuickAction: (AppTab) -> Unit,
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(MaterialTheme.shapes.large)
            .background(
                brush = Brush.verticalGradient(
                    colors = listOf(DashboardAccentStrong, DashboardAccent, MaterialTheme.colorScheme.surfaceVariant),
                ),
            )
            .padding(20.dp),
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Text(
                text = "Dashboard Android yang sekarang dibikin lebih dekat ke rasa website.",
                style = MaterialTheme.typography.headlineSmall,
                color = Color.White,
            )
            Text(
                text = "Bulan ${formatMonth(activeMonth)} untuk ${profile.fullName ?: userEmail.ifBlank { "akun utama" }}",
                style = MaterialTheme.typography.bodyMedium,
                color = Color.White.copy(alpha = 0.88f),
            )
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                MonthNavigatorButton(
                    modifier = Modifier.weight(1f),
                    icon = Icons.Outlined.ArrowBack,
                    label = formatMonth(activeMonth.minusMonths(1)),
                    onClick = { onMonthChange(activeMonth.minusMonths(1).toString()) },
                )
                MonthNavigatorButton(
                    modifier = Modifier.weight(1f),
                    icon = Icons.Outlined.ArrowForward,
                    label = formatMonth(activeMonth.plusMonths(1)),
                    enabled = activeMonth < YearMonth.now(),
                    onClick = { onMonthChange(activeMonth.plusMonths(1).toString()) },
                )
            }
            Row(
                modifier = Modifier.horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                availableMonths.forEach { month ->
                    FilterChip(
                        selected = month == activeMonth,
                        onClick = { onMonthChange(month.toString()) },
                        label = { Text(formatMonth(month)) },
                    )
                }
            }
            Row(
                modifier = Modifier.horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                QuickActionButton("Tambah pemasukan", DashboardIncome) { onQuickAction(AppTab.Income) }
                QuickActionButton("Tambah pengeluaran", DashboardExpense) { onQuickAction(AppTab.Expenses) }
                QuickActionButton("Tambah hutang", DashboardDebt) { onQuickAction(AppTab.Debts) }
                QuickActionButton("Lihat riwayat", DashboardAccent) { onQuickAction(AppTab.History) }
            }
        }
    }
}

@Composable
private fun DashboardRecordGroup(
    title: String,
    records: List<TransactionRecord>,
    currencyCode: String,
    accentColor: Color,
) {
    Text(title, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
    if (records.isEmpty()) {
        EmptyState("Belum ada transaksi besar yang tercatat bulan ini.")
    } else {
        records.take(3).forEach { record ->
            TransactionListItem(record = record, currencyCode = currencyCode, accentColor = accentColor, onDelete = null)
        }
    }
}

@Composable
private fun DashboardDebtGroup(
    debts: List<DebtRecord>,
    currencyCode: String,
) {
    if (debts.isEmpty()) {
        EmptyState("Belum ada hutang aktif yang perlu dikejar.")
    } else {
        debts.forEach { debt ->
            DebtListItem(debt = debt, currencyCode = currencyCode, onMarkPaid = null)
        }
    }
}

@Composable
private fun MonthNavigatorButton(
    modifier: Modifier = Modifier,
    icon: ImageVector,
    label: String,
    enabled: Boolean = true,
    onClick: () -> Unit,
) {
    Surface(
        modifier = modifier,
        shape = MaterialTheme.shapes.medium,
        color = Color.White.copy(alpha = 0.16f),
        border = BorderStroke(1.dp, Color.White.copy(alpha = 0.14f)),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 10.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(onClick = onClick, enabled = enabled, modifier = Modifier.size(20.dp)) {
                Icon(icon, contentDescription = null, tint = Color.White)
            }
            Text(
                text = label,
                style = MaterialTheme.typography.labelLarge,
                color = Color.White,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}

@Composable
private fun QuickActionButton(
    label: String,
    color: Color,
    onClick: () -> Unit,
) {
    FilledTonalButton(onClick = onClick, shape = RoundedCornerShape(18.dp)) {
        Box(
            modifier = Modifier
                .clip(RoundedCornerShape(999.dp))
                .background(color.copy(alpha = 0.18f))
                .padding(horizontal = 10.dp, vertical = 6.dp),
        ) {
            Text(label, style = MaterialTheme.typography.labelLarge, color = Color.White)
        }
    }
}

@Composable
private fun MetricCard(
    modifier: Modifier = Modifier,
    title: String,
    value: String,
    tone: Color,
) {
    Surface(
        modifier = modifier,
        shape = MaterialTheme.shapes.large,
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, tone.copy(alpha = 0.18f)),
    ) {
        Column(modifier = Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Box(modifier = Modifier.size(12.dp).clip(CircleShape).background(tone))
            Text(title, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(value, style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.onSurface, maxLines = 2)
        }
    }
}

@Composable
private fun TrendChart(points: List<MonthTrend>) {
    val maxValue = points.maxOfOrNull { max(it.income, it.expense) }?.coerceAtLeast(1.0) ?: 1.0
    Row(modifier = Modifier.fillMaxWidth().height(180.dp), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.Bottom) {
        points.forEach { point ->
            Column(modifier = Modifier.weight(1f), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Bottom) {
                Row(
                    modifier = Modifier.fillMaxHeight().padding(bottom = 12.dp),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalAlignment = Alignment.Bottom,
                ) {
                    Box(modifier = Modifier.width(12.dp).height(barHeight(point.income, maxValue)).clip(RoundedCornerShape(topStart = 10.dp, topEnd = 10.dp)).background(DashboardIncome))
                    Box(modifier = Modifier.width(12.dp).height(barHeight(point.expense, maxValue)).clip(RoundedCornerShape(topStart = 10.dp, topEnd = 10.dp)).background(DashboardExpense))
                }
                Text(point.label.replaceFirstChar { it.titlecase(Locale("id", "ID")) }, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}

@Composable
private fun SummaryBadgeRow(
    firstLabel: String,
    firstValue: String,
    secondLabel: String,
    secondValue: String,
) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        SummaryBadge(modifier = Modifier.weight(1f), label = firstLabel, value = firstValue)
        SummaryBadge(modifier = Modifier.weight(1f), label = secondLabel, value = secondValue)
    }
}

@Composable
private fun SummaryBadge(
    modifier: Modifier = Modifier,
    label: String,
    value: String,
) {
    Surface(modifier = modifier, shape = MaterialTheme.shapes.medium, color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.72f)) {
        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(label, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(value, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface, maxLines = 2, overflow = TextOverflow.Ellipsis)
        }
    }
}

@Composable
private fun BreakdownRow(
    label: String,
    value: String,
    ratio: Float,
    color: Color,
) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Text(label, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
            Text(value, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Box(modifier = Modifier.fillMaxWidth().height(10.dp).clip(CircleShape).background(MaterialTheme.colorScheme.surfaceVariant)) {
            Box(modifier = Modifier.fillMaxWidth(ratio.coerceIn(0f, 1f)).fillMaxHeight().background(color))
        }
    }
}

private fun barHeight(value: Double, maxValue: Double) =
    if (value <= 0.0) 10.dp else (((value / maxValue) * 120.0).coerceAtLeast(20.0)).dp
