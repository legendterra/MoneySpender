package net.moneyspender.android.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AccountBalanceWallet
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.History
import androidx.compose.material.icons.outlined.Insights
import androidx.compose.material.icons.outlined.Payments
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.ReceiptLong
import androidx.compose.material.icons.outlined.WarningAmber
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay
import net.moneyspender.android.data.Category
import net.moneyspender.android.data.DebtDraft
import net.moneyspender.android.data.DebtRecord
import net.moneyspender.android.data.HistoryFilter
import net.moneyspender.android.data.HistoryItem
import net.moneyspender.android.data.TransactionDraft
import net.moneyspender.android.data.TransactionRecord

private enum class DebtConfirmStep { Prompt, Confirm }

@Composable
fun TransactionsScreen(
    modifier: Modifier = Modifier,
    title: String,
    subtitle: String,
    categories: List<Category>,
    draft: TransactionDraft,
    records: List<TransactionRecord>,
    accentColor: Color,
    onDraftChange: ((TransactionDraft) -> TransactionDraft) -> Unit,
    onSave: () -> Unit,
    onDelete: (String) -> Unit,
) {
    LazyColumn(
        modifier = modifier,
        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item {
            AppPanel {
                SectionHeading(title = title, subtitle = subtitle)
                AppTextField(
                    value = draft.amount,
                    onValueChange = { value -> onDraftChange { it.copy(amount = value) } },
                    label = "Nominal",
                    leadingIcon = Icons.Outlined.AccountBalanceWallet,
                    keyboardType = androidx.compose.ui.text.input.KeyboardType.Decimal,
                )
                AppTextField(
                    value = draft.transactionDate,
                    onValueChange = { value -> onDraftChange { it.copy(transactionDate = value) } },
                    label = "Tanggal (DD/MM/YYYY)",
                    leadingIcon = Icons.Outlined.CalendarMonth,
                )
                Text("Kategori", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
                if (categories.isEmpty()) {
                    EmptyState("Kategori belum tersedia. Tambahkan dari halaman pengaturan.")
                } else {
                    Row(
                        modifier = Modifier.horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        categories.forEach { category ->
                            FilterChip(
                                selected = draft.categoryId == category.id,
                                onClick = { onDraftChange { it.copy(categoryId = category.id) } },
                                label = { Text(category.name) },
                            )
                        }
                    }
                }
                AppTextField(
                    value = draft.merchant,
                    onValueChange = { value -> onDraftChange { it.copy(merchant = value) } },
                    label = "Merchant / sumber",
                    leadingIcon = Icons.Outlined.ReceiptLong,
                )
                AppTextField(
                    value = draft.paymentMethod,
                    onValueChange = { value -> onDraftChange { it.copy(paymentMethod = value) } },
                    label = "Metode bayar",
                    leadingIcon = Icons.Outlined.Payments,
                )
                AppTextField(
                    value = draft.reason,
                    onValueChange = { value -> onDraftChange { it.copy(reason = value) } },
                    label = "Catatan",
                    leadingIcon = Icons.Outlined.Insights,
                    singleLine = false,
                )
                Button(onClick = onSave, modifier = Modifier.fillMaxWidth()) {
                    Text("Simpan transaksi")
                }
            }
        }

        item {
            AppPanel {
                SectionHeading(
                    title = "Riwayat terbaru",
                    subtitle = "Daftar transaksi disusun rapih supaya tetap enak discan di layar sempit.",
                )
                if (records.isEmpty()) {
                    EmptyState("Belum ada transaksi di bulan terpilih.")
                } else {
                    records.forEach { record ->
                        TransactionListItem(record = record, currencyCode = "IDR", accentColor = accentColor, onDelete = onDelete)
                    }
                }
            }
        }
    }
}

@Composable
fun DebtScreen(
    modifier: Modifier = Modifier,
    draft: DebtDraft,
    debts: List<DebtRecord>,
    currencyCode: String,
    onDraftChange: ((DebtDraft) -> DebtDraft) -> Unit,
    onSave: () -> Unit,
    onMarkPaid: (String) -> Unit,
) {
    var selectedDebt by remember { mutableStateOf<DebtRecord?>(null) }
    var confirmStep by remember { mutableStateOf(DebtConfirmStep.Prompt) }
    var countdown by remember { mutableIntStateOf(10) }

    fun openDebtConfirmation(debt: DebtRecord) {
        selectedDebt = debt
        confirmStep = DebtConfirmStep.Prompt
        countdown = 10
    }

    fun closeDebtConfirmation() {
        selectedDebt = null
        confirmStep = DebtConfirmStep.Prompt
        countdown = 10
    }

    LaunchedEffect(selectedDebt?.id, confirmStep, countdown) {
        if (selectedDebt == null || confirmStep != DebtConfirmStep.Confirm || countdown <= 0) {
            return@LaunchedEffect
        }

        delay(1_000)
        countdown -= 1
    }

    LazyColumn(
        modifier = modifier,
        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item {
            AppPanel {
                SectionHeading(
                    title = "Tambah hutang baru",
                    subtitle = "Form hutang disederhanakan agar tetap cepat, namun informasinya masih lengkap.",
                )
                AppTextField(
                    value = draft.amount,
                    onValueChange = { value -> onDraftChange { it.copy(amount = value) } },
                    label = "Nominal",
                    leadingIcon = Icons.Outlined.AccountBalanceWallet,
                    keyboardType = androidx.compose.ui.text.input.KeyboardType.Decimal,
                )
                AppTextField(
                    value = draft.debtDate,
                    onValueChange = { value -> onDraftChange { it.copy(debtDate = value) } },
                    label = "Tanggal hutang (DD/MM/YYYY)",
                    leadingIcon = Icons.Outlined.CalendarMonth,
                )
                AppTextField(
                    value = draft.sourceName,
                    onValueChange = { value -> onDraftChange { it.copy(sourceName = value) } },
                    label = "Sumber transaksi",
                    leadingIcon = Icons.Outlined.ReceiptLong,
                )
                AppTextField(
                    value = draft.lenderName,
                    onValueChange = { value -> onDraftChange { it.copy(lenderName = value) } },
                    label = "Pemberi hutang",
                    leadingIcon = Icons.Outlined.Person,
                )
                AppTextField(
                    value = draft.reason,
                    onValueChange = { value -> onDraftChange { it.copy(reason = value) } },
                    label = "Alasan",
                    leadingIcon = Icons.Outlined.WarningAmber,
                    singleLine = false,
                )
                Button(onClick = onSave, modifier = Modifier.fillMaxWidth()) {
                    Text("Simpan hutang")
                }
            }
        }

        item {
            AppPanel {
                SectionHeading(
                    title = "Daftar hutang",
                    subtitle = "Status belum lunas dan aksi pelunasan dibuat lebih jelas seperti dashboard web.",
                )
                if (debts.isEmpty()) {
                    EmptyState("Tidak ada hutang pada bulan terpilih.")
                } else {
                    debts.forEach { debt ->
                        DebtListItem(
                            debt = debt,
                            currencyCode = currencyCode,
                            onMarkPaid = { openDebtConfirmation(debt) },
                        )
                    }
                }
            }
        }
    }

    selectedDebt?.let { debt ->
        when (confirmStep) {
            DebtConfirmStep.Prompt -> {
                AlertDialog(
                    onDismissRequest = ::closeDebtConfirmation,
                    title = { Text("Konfirmasi pertama") },
                    text = {
                        Text(
                            "Hutang ${formatCurrency(debt.amount, currencyCode)} ke ${debt.lenderName} sudah dibayar?",
                        )
                    },
                    dismissButton = {
                        TextButton(onClick = ::closeDebtConfirmation) {
                            Text("Belum")
                        }
                    },
                    confirmButton = {
                        Button(onClick = {
                            confirmStep = DebtConfirmStep.Confirm
                            countdown = 10
                        }) {
                            Text("Ya, lanjut")
                        }
                    },
                )
            }

            DebtConfirmStep.Confirm -> {
                AlertDialog(
                    onDismissRequest = ::closeDebtConfirmation,
                    title = { Text("Konfirmasi kedua") },
                    text = {
                        Text(
                            if (countdown > 0) {
                                "Yakin benar-benar lunas? Tombol final aktif dalam $countdown detik."
                            } else {
                                "Yakin benar-benar lunas?"
                            },
                        )
                    },
                    dismissButton = {
                        TextButton(onClick = ::closeDebtConfirmation) {
                            Text("Batal")
                        }
                    },
                    confirmButton = {
                        Button(
                            onClick = {
                                onMarkPaid(debt.id)
                                closeDebtConfirmation()
                            },
                            enabled = countdown <= 0,
                        ) {
                            Text("Ya, tandai lunas")
                        }
                    },
                )
            }
        }
    }
}

@Composable
fun HistoryScreen(
    modifier: Modifier = Modifier,
    items: List<HistoryItem>,
    filter: HistoryFilter,
    currencyCode: String,
    onFilterChange: ((HistoryFilter) -> HistoryFilter) -> Unit,
    onApplyFilter: () -> Unit,
) {
    LazyColumn(
        modifier = modifier,
        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item {
            AppPanel {
                SectionHeading(
                    title = "Filter riwayat",
                    subtitle = "Gunakan tanggal, tahun, atau hari untuk membatasi data dengan cepat.",
                )
                AppTextField(
                    value = filter.date,
                    onValueChange = { value -> onFilterChange { it.copy(date = value) } },
                    label = "Tanggal (DD/MM/YYYY)",
                    leadingIcon = Icons.Outlined.CalendarMonth,
                )
                AppTextField(
                    value = filter.year,
                    onValueChange = { value -> onFilterChange { it.copy(year = value) } },
                    label = "Tahun",
                    leadingIcon = Icons.Outlined.History,
                    keyboardType = androidx.compose.ui.text.input.KeyboardType.Number,
                )
                Row(
                    modifier = Modifier.horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    weekdayChips.forEach { (value, label) ->
                        FilterChip(
                            selected = filter.weekday == value,
                            onClick = { onFilterChange { it.copy(weekday = value) } },
                            label = { Text(label) },
                        )
                    }
                }
                Button(onClick = onApplyFilter, modifier = Modifier.fillMaxWidth()) {
                    Text("Terapkan filter")
                }
            }
        }

        item {
            AppPanel {
                SectionHeading(
                    title = "Semua aktivitas",
                    subtitle = "Pemasukan, pengeluaran, dan hutang dicampur agar penelusuran lebih praktis.",
                )
                if (items.isEmpty()) {
                    EmptyState("Belum ada data yang cocok dengan filter.")
                } else {
                    items.forEach { item ->
                        HistoryListItem(item = item, currencyCode = currencyCode)
                    }
                }
            }
        }
    }
}

@Composable
fun TransactionListItem(
    record: TransactionRecord,
    currencyCode: String,
    accentColor: Color,
    onDelete: ((String) -> Unit)?,
) {
    Surface(shape = MaterialTheme.shapes.medium, color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.44f)) {
        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(modifier = Modifier.size(12.dp).clip(CircleShape).background(accentColor))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = record.categoryLabel ?: record.merchant.orEmpty().ifBlank { "Transaksi" },
                        style = MaterialTheme.typography.titleMedium,
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                    Text(
                        text = listOfNotNull(record.reason, record.paymentMethod).joinToString(" | ").ifBlank {
                            formatDisplayDate(record.transactionDate)
                        },
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Text(formatCurrency(record.amount, currencyCode), style = MaterialTheme.typography.titleMedium, color = accentColor)
            }
            Text(
                formatDisplayDate(record.transactionDate),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            onDelete?.let {
                TextButton(onClick = { it(record.id) }) {
                    Text("Hapus")
                }
            }
        }
    }
}

@Composable
fun DebtListItem(
    debt: DebtRecord,
    currencyCode: String,
    onMarkPaid: ((String) -> Unit)?,
) {
    Surface(shape = MaterialTheme.shapes.medium, color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.44f)) {
        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
                IconTint(text = "!", color = DashboardDebt)
                Column(modifier = Modifier.weight(1f)) {
                    Text("Hutang ke ${debt.lenderName}", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
                    Text(
                        text = "${debt.sourceName} | ${debt.reason}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                Text(formatCurrency(debt.amount, currencyCode), style = MaterialTheme.typography.titleMedium, color = DashboardDebt)
            }
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = if (debt.isPaid) {
                        "Lunas pada ${formatDisplayDate(debt.paidAt ?: debt.debtDate)}"
                    } else {
                        "Belum lunas sejak ${formatDisplayDate(debt.debtDate)}"
                    },
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                onMarkPaid?.takeIf { !debt.isPaid }?.let {
                    TextButton(onClick = { it(debt.id) }) {
                        Text("Tandai lunas")
                    }
                }
            }
        }
    }
}

@Composable
fun HistoryListItem(
    item: HistoryItem,
    currencyCode: String,
) {
    val tone = when (item.type) {
        "income" -> DashboardIncome
        "expense" -> DashboardExpense
        else -> DashboardDebt
    }
    Surface(shape = MaterialTheme.shapes.medium, color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.44f)) {
        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(modifier = Modifier.size(12.dp).clip(CircleShape).background(tone))
                Column(modifier = Modifier.weight(1f)) {
                    Text(item.title, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
                    Text(item.subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 2, overflow = TextOverflow.Ellipsis)
                }
                Text(formatCurrency(item.amount, currencyCode), style = MaterialTheme.typography.titleMedium, color = tone)
            }
            Text(
                text = "${formatDisplayDate(item.date)} | ${item.statusLabel}" + item.detail?.let { " | $it" }.orEmpty(),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun IconTint(
    text: String,
    color: Color,
) {
    Box(
        modifier = Modifier.size(24.dp).clip(CircleShape).background(color.copy(alpha = 0.18f)),
        contentAlignment = Alignment.Center,
    ) {
        Text(text = text, color = color, style = MaterialTheme.typography.labelLarge)
    }
}
