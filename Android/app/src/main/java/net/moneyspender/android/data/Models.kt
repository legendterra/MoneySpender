package net.moneyspender.android.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonObject
import java.time.LocalDate
import java.time.format.DateTimeFormatter

@Serializable
data class AuthSession(
    @SerialName("access_token") val accessToken: String,
    @SerialName("refresh_token") val refreshToken: String,
    @SerialName("token_type") val tokenType: String = "bearer",
    @SerialName("expires_in") val expiresIn: Long = 3600,
    @SerialName("expires_at") val expiresAt: Long? = null,
    val user: AuthUser? = null,
)

@Serializable
data class AuthUser(
    val id: String,
    val email: String? = null,
    @SerialName("user_metadata") val userMetadata: JsonObject? = null,
)

@Serializable
data class Profile(
    val id: String? = null,
    @SerialName("full_name") val fullName: String? = null,
    @SerialName("currency_code") val currencyCode: String = "IDR",
    @SerialName("monthly_savings_goal") val monthlySavingsGoal: Double = 4_000_000.0,
    @SerialName("yearly_savings_goal") val yearlySavingsGoal: Double = 48_000_000.0,
)

@Serializable
data class Category(
    val id: String,
    val name: String,
    val type: String,
    val color: String? = null,
)

@Serializable
data class TransactionRecord(
    val id: String,
    val amount: Double,
    val type: String,
    @SerialName("transaction_date") val transactionDate: String,
    val reason: String? = null,
    val merchant: String? = null,
    @SerialName("payment_method") val paymentMethod: String? = null,
    @SerialName("category_label") val categoryLabel: String? = null,
)

@Serializable
data class DebtRecord(
    val id: String,
    val amount: Double,
    @SerialName("debt_date") val debtDate: String,
    @SerialName("source_name") val sourceName: String,
    @SerialName("lender_name") val lenderName: String,
    val reason: String,
    @SerialName("category_label") val categoryLabel: String? = null,
    @SerialName("is_paid") val isPaid: Boolean = false,
    @SerialName("paid_at") val paidAt: String? = null,
)

@Serializable
data class ReminderPreferences(
    @SerialName("user_id") val userId: String? = null,
    @SerialName("reminder_morning_enabled") val reminderMorningEnabled: Boolean = true,
    @SerialName("reminder_evening_enabled") val reminderEveningEnabled: Boolean = true,
    @SerialName("push_enabled") val pushEnabled: Boolean = false,
)

data class DashboardSummary(
    val income: Double = 0.0,
    val expense: Double = 0.0,
    val balance: Double = 0.0,
    val savingsRate: Int = 0,
    val monthlyGoal: Double = 0.0,
    val yearlyGoal: Double = 0.0,
    val yearBalance: Double = 0.0,
    val totalOutstandingDebt: Double = 0.0,
    val unpaidDebtCount: Int = 0,
    val topIncome: List<TransactionRecord> = emptyList(),
    val topExpense: List<TransactionRecord> = emptyList(),
    val recentDebts: List<DebtRecord> = emptyList(),
)

data class AppSnapshot(
    val user: AuthUser,
    val profile: Profile,
    val categories: List<Category>,
    val reminder: ReminderPreferences,
    val transactions: List<TransactionRecord>,
    val debts: List<DebtRecord>,
    val dashboard: DashboardSummary,
)

data class HistoryFilter(
    val date: String = "",
    val weekday: String = "all",
    val year: String = "",
)

data class HistoryItem(
    val id: String,
    val source: String,
    val type: String,
    val amount: Double,
    val date: String,
    val title: String,
    val subtitle: String,
    val detail: String?,
    val statusLabel: String,
)

data class AuthFormState(
    val email: String = "",
    val password: String = "",
    val fullName: String = "",
    val otpToken: String = "",
    val newPassword: String = "",
)

data class TransactionDraft(
    val amount: String = "",
    val categoryId: String = "",
    val transactionDate: String = todayDisplayDate(),
    val reason: String = "",
    val merchant: String = "",
    val paymentMethod: String = "",
)

data class DebtDraft(
    val amount: String = "",
    val debtDate: String = todayDisplayDate(),
    val sourceName: String = "",
    val lenderName: String = "",
    val reason: String = "",
)

data class CategoryDraft(
    val name: String = "",
    val type: String = "expense",
)

data class ProfileDraft(
    val fullName: String = "",
    val currencyCode: String = "IDR",
    val monthlyGoal: String = "4000000",
    val yearlyGoal: String = "48000000",
)

private val dateDisplayFormatter: DateTimeFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy")

fun todayDisplayDate(): String = LocalDate.now().format(dateDisplayFormatter)

fun todayIso(): String = LocalDate.now().toString()
