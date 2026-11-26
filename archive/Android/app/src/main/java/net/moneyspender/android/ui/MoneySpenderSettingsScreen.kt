package net.moneyspender.android.ui

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AccountCircle
import androidx.compose.material.icons.outlined.Category
import androidx.compose.material.icons.outlined.Insights
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.Logout
import androidx.compose.material.icons.outlined.Payments
import androidx.compose.material.icons.outlined.Savings
import androidx.compose.material3.Button
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import net.moneyspender.android.data.AppSnapshot
import net.moneyspender.android.data.ProfileDraft

@Composable
fun SettingsScreen(
    modifier: Modifier = Modifier,
    snapshot: AppSnapshot,
    profileDraft: ProfileDraft,
    categoryName: String,
    categoryType: String,
    recoveryMode: Boolean,
    recoveryPassword: String,
    onProfileChange: ((ProfileDraft) -> ProfileDraft) -> Unit,
    onSaveProfile: () -> Unit,
    onReminderChange: (Boolean, Boolean, Boolean) -> Unit,
    onCategoryNameChange: (String) -> Unit,
    onCategoryTypeChange: (String) -> Unit,
    onAddCategory: () -> Unit,
    onDeleteCategory: (String) -> Unit,
    onRecoveryPasswordChange: (String) -> Unit,
    onCompleteRecovery: () -> Unit,
    onLogout: () -> Unit,
) {
    LazyColumn(
        modifier = modifier,
        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item {
            AppPanel {
                SectionHeading(
                    title = "Profil & target",
                    subtitle = "Data utama akun dibuat singkat, jelas, dan mudah diubah dari mobile.",
                )
                AppTextField(
                    value = profileDraft.fullName,
                    onValueChange = { value -> onProfileChange { it.copy(fullName = value) } },
                    label = "Nama lengkap",
                    leadingIcon = Icons.Outlined.AccountCircle,
                )
                AppTextField(
                    value = profileDraft.currencyCode,
                    onValueChange = { value -> onProfileChange { it.copy(currencyCode = value) } },
                    label = "Kode mata uang",
                    leadingIcon = Icons.Outlined.Payments,
                )
                AppTextField(
                    value = profileDraft.monthlyGoal,
                    onValueChange = { value -> onProfileChange { it.copy(monthlyGoal = value) } },
                    label = "Target bulanan",
                    leadingIcon = Icons.Outlined.Savings,
                    keyboardType = androidx.compose.ui.text.input.KeyboardType.Decimal,
                )
                AppTextField(
                    value = profileDraft.yearlyGoal,
                    onValueChange = { value -> onProfileChange { it.copy(yearlyGoal = value) } },
                    label = "Target tahunan",
                    leadingIcon = Icons.Outlined.Insights,
                    keyboardType = androidx.compose.ui.text.input.KeyboardType.Decimal,
                )
                Button(onClick = onSaveProfile, modifier = Modifier.fillMaxWidth()) {
                    Text("Simpan profil")
                }
            }
        }

        item {
            AppPanel {
                SectionHeading(
                    title = "Reminder",
                    subtitle = "Preferensi reminder tetap sinkron ke backend yang sama dengan website.",
                )
                SettingToggleRow(
                    title = "Reminder pagi",
                    subtitle = "Aktifkan pengingat untuk mulai cek pemasukan dan target harian.",
                    checked = snapshot.reminder.reminderMorningEnabled,
                    onCheckedChange = { value ->
                        onReminderChange(
                            value,
                            snapshot.reminder.reminderEveningEnabled,
                            snapshot.reminder.pushEnabled,
                        )
                    },
                )
                SettingToggleRow(
                    title = "Reminder malam",
                    subtitle = "Cocok untuk review pengeluaran sebelum hari berganti.",
                    checked = snapshot.reminder.reminderEveningEnabled,
                    onCheckedChange = { value ->
                        onReminderChange(
                            snapshot.reminder.reminderMorningEnabled,
                            value,
                            snapshot.reminder.pushEnabled,
                        )
                    },
                )
                SettingToggleRow(
                    title = "Push notification",
                    subtitle = "Toggle ini menyimpan preferensi. Push native penuh tetap butuh FCM di backend.",
                    checked = snapshot.reminder.pushEnabled,
                    onCheckedChange = { value ->
                        onReminderChange(
                            snapshot.reminder.reminderMorningEnabled,
                            snapshot.reminder.reminderEveningEnabled,
                            value,
                        )
                    },
                )
            }
        }

        item {
            AppPanel {
                SectionHeading(
                    title = "Kelola kategori",
                    subtitle = "Tambahkan kategori baru langsung dari HP tanpa harus ke desktop.",
                )
                AppTextField(
                    value = categoryName,
                    onValueChange = onCategoryNameChange,
                    label = "Nama kategori",
                    leadingIcon = Icons.Outlined.Category,
                )
                Row(
                    modifier = Modifier.horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    listOf(
                        "expense" to "Pengeluaran",
                        "income" to "Pemasukan",
                        "debt" to "Hutang",
                    ).forEach { (value, label) ->
                        FilterChip(
                            selected = categoryType == value,
                            onClick = { onCategoryTypeChange(value) },
                            label = { Text(label) },
                        )
                    }
                }
                Button(onClick = onAddCategory, modifier = Modifier.fillMaxWidth()) {
                    Text("Tambah kategori")
                }
                if (snapshot.categories.isEmpty()) {
                    EmptyState("Belum ada kategori yang tersimpan.")
                } else {
                    snapshot.categories.sortedBy { it.name }.forEach { category ->
                        CategoryRow(category = category, onDelete = onDeleteCategory)
                    }
                }
            }
        }

        item {
            AppPanel {
                SectionHeading(
                    title = "Password recovery",
                    subtitle = "Bagian ini aktif setelah Anda membuka link reset password di aplikasi Android.",
                )
                AppTextField(
                    value = recoveryPassword,
                    onValueChange = onRecoveryPasswordChange,
                    label = "Password baru",
                    leadingIcon = Icons.Outlined.Lock,
                    keyboardType = androidx.compose.ui.text.input.KeyboardType.Password,
                    singleLine = true,
                )
                Button(
                    onClick = onCompleteRecovery,
                    enabled = recoveryMode,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(if (recoveryMode) "Simpan password baru" else "Menunggu mode recovery")
                }
            }
        }

        item {
            AppPanel {
                SectionHeading(
                    title = "Akun",
                    subtitle = "Logout tetap tersedia cepat tanpa mengorbankan tampilan yang bersih.",
                )
                OutlinedButton(onClick = onLogout, modifier = Modifier.fillMaxWidth()) {
                    Icon(Icons.Outlined.Logout, contentDescription = null)
                    Text("Logout")
                }
            }
        }
    }
}
