package net.moneyspender.android.viewmodel

import android.content.Intent
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import java.time.YearMonth
import kotlinx.coroutines.launch
import net.moneyspender.android.data.AppSnapshot
import net.moneyspender.android.data.AuthFormState
import net.moneyspender.android.data.CategoryDraft
import net.moneyspender.android.data.DebtDraft
import net.moneyspender.android.data.HistoryFilter
import net.moneyspender.android.data.HistoryItem
import net.moneyspender.android.data.MoneySpenderRepository
import net.moneyspender.android.data.Profile
import net.moneyspender.android.data.ProfileDraft
import net.moneyspender.android.data.ReminderPreferences
import net.moneyspender.android.data.TransactionDraft

enum class AuthTab { SignIn, SignUp, Otp, Reset }
enum class AppTab { Dashboard, Income, Expenses, Debts, History, Settings }

data class UiState(
    val isLoading: Boolean = true,
    val isAuthenticated: Boolean = false,
    val selectedMonth: String = YearMonth.now().toString(),
    val selectedTab: AppTab = AppTab.Dashboard,
    val authTab: AuthTab = AuthTab.SignIn,
    val authForm: AuthFormState = AuthFormState(),
    val incomeDraft: TransactionDraft = TransactionDraft(paymentMethod = "Transfer"),
    val expenseDraft: TransactionDraft = TransactionDraft(paymentMethod = "QRIS"),
    val debtDraft: DebtDraft = DebtDraft(),
    val categoryDraft: CategoryDraft = CategoryDraft(),
    val profileDraft: ProfileDraft = ProfileDraft(),
    val snapshot: AppSnapshot? = null,
    val historyFilter: HistoryFilter = HistoryFilter(),
    val historyItems: List<HistoryItem> = emptyList(),
    val recoveryMode: Boolean = false,
    val message: String? = null,
    val error: String? = null,
)

class MoneySpenderViewModel(
    private val repository: MoneySpenderRepository,
) : ViewModel() {
    var state by mutableStateOf(UiState())
        private set

    init {
        bootstrap()
    }

    private fun bootstrap() {
        viewModelScope.launch {
            state = state.copy(isLoading = true)
            runCatching { repository.bootstrap() }
                .onSuccess { user ->
                    if (user == null) {
                        state = state.copy(isLoading = false, isAuthenticated = false)
                    } else {
                        refreshSnapshot()
                    }
                }
                .onFailure { state = state.copy(isLoading = false, error = it.message) }
        }
    }

    fun setAuthTab(tab: AuthTab) {
        state = state.copy(authTab = tab)
    }

    fun setTab(tab: AppTab) {
        state = state.copy(selectedTab = tab)
        if (tab == AppTab.History) {
            loadHistory()
        }
    }

    fun setMonth(month: String) {
        state = state.copy(selectedMonth = month)
        refreshSnapshot()
    }

    fun updateAuthForm(transform: (AuthFormState) -> AuthFormState) {
        state = state.copy(authForm = transform(state.authForm))
    }

    fun updateIncomeDraft(transform: (TransactionDraft) -> TransactionDraft) {
        state = state.copy(incomeDraft = transform(state.incomeDraft))
    }

    fun updateExpenseDraft(transform: (TransactionDraft) -> TransactionDraft) {
        state = state.copy(expenseDraft = transform(state.expenseDraft))
    }

    fun updateDebtDraft(transform: (DebtDraft) -> DebtDraft) {
        state = state.copy(debtDraft = transform(state.debtDraft))
    }

    fun updateCategoryDraft(transform: (CategoryDraft) -> CategoryDraft) {
        state = state.copy(categoryDraft = transform(state.categoryDraft))
    }

    fun updateProfileDraft(transform: (ProfileDraft) -> ProfileDraft) {
        state = state.copy(profileDraft = transform(state.profileDraft))
    }

    fun updateHistoryFilter(transform: (HistoryFilter) -> HistoryFilter) {
        state = state.copy(historyFilter = transform(state.historyFilter))
    }

    fun applyHistoryFilter() {
        loadHistory()
    }

    fun clearBanner() {
        state = state.copy(message = null, error = null)
    }

    fun signIn() = runTask {
        repository.signIn(state.authForm.email, state.authForm.password)
        refreshSnapshot("Berhasil login.")
    }

    fun signUp() = runTask {
        val message = repository.signUp(
            email = state.authForm.email,
            password = state.authForm.password,
            fullName = state.authForm.fullName,
        )
        state = state.copy(authTab = AuthTab.SignIn, message = message)
    }

    fun sendOtp() = runTask {
        state = state.copy(message = repository.sendOtp(state.authForm.email))
    }

    fun verifyOtp() = runTask {
        repository.verifyOtp(state.authForm.email, state.authForm.otpToken)
        refreshSnapshot("OTP berhasil diverifikasi.")
    }

    fun sendResetEmail() = runTask {
        state = state.copy(message = repository.sendResetPassword(state.authForm.email))
    }

    fun createGoogleIntent(): Intent = repository.createGoogleIntent()

    fun handleIncomingUrl(url: String) = runTask {
        val user = repository.handleIncomingUrl(url)
        if (user != null) {
            state = state.copy(recoveryMode = url.contains("type=recovery"))
            refreshSnapshot("Login Google berhasil.")
        }
    }

    fun completeRecovery() = runTask {
        repository.completeRecovery(state.authForm.newPassword)
        state = state.copy(recoveryMode = false, message = "Password baru berhasil disimpan.")
    }

    fun logout() = runTask {
        repository.logout()
        state = UiState(isLoading = false, isAuthenticated = false)
    }

    fun saveTransaction(type: String) = runTask {
        val draft = if (type == "income") state.incomeDraft else state.expenseDraft
        repository.addTransaction(type, draft)
        state = state.copy(
            incomeDraft = if (type == "income") TransactionDraft(paymentMethod = "Transfer") else state.incomeDraft,
            expenseDraft = if (type == "expense") TransactionDraft(paymentMethod = "QRIS") else state.expenseDraft,
        )
        refreshSnapshot("Transaksi berhasil disimpan.")
    }

    fun deleteTransaction(id: String) = runTask {
        repository.deleteTransaction(id)
        refreshSnapshot("Transaksi berhasil dihapus.")
    }

    fun saveDebt() = runTask {
        repository.addDebt(state.debtDraft)
        state = state.copy(debtDraft = DebtDraft())
        refreshSnapshot("Hutang berhasil disimpan.")
    }

    fun markDebtPaid(id: String) = runTask {
        repository.markDebtPaid(id)
        refreshSnapshot("Hutang ditandai lunas.")
    }

    fun saveProfile() = runTask {
        repository.saveProfile(state.profileDraft)
        refreshSnapshot("Profil berhasil disimpan.")
    }

    fun toggleReminder(current: ReminderPreferences, morning: Boolean, evening: Boolean, push: Boolean) = runTask {
        repository.saveReminder(
            current.copy(
                reminderMorningEnabled = morning,
                reminderEveningEnabled = evening,
                pushEnabled = push,
            ),
        )
        refreshSnapshot("Reminder berhasil diperbarui.")
    }

    fun addCategory() = runTask {
        repository.addCategory(state.categoryDraft)
        state = state.copy(categoryDraft = CategoryDraft())
        refreshSnapshot("Kategori ditambahkan.")
    }

    fun deleteCategory(id: String) = runTask {
        repository.deleteCategory(id)
        refreshSnapshot("Kategori dihapus.")
    }

    private fun refreshSnapshot(success: String? = null) {
        viewModelScope.launch {
            state = state.copy(isLoading = true)
            runCatching { repository.loadSnapshot(state.selectedMonth) }
                .onSuccess { snapshot ->
                    state = state.copy(
                        isLoading = false,
                        isAuthenticated = true,
                        snapshot = snapshot,
                        profileDraft = snapshot.profile.toDraft(),
                        message = success,
                    )
                    if (state.selectedTab == AppTab.History) {
                        loadHistory()
                    }
                }
                .onFailure { state = state.copy(isLoading = false, error = it.message) }
        }
    }

    private fun loadHistory() {
        viewModelScope.launch {
            runCatching { repository.buildHistory(state.historyFilter) }
                .onSuccess { items -> state = state.copy(historyItems = items) }
                .onFailure { state = state.copy(error = it.message) }
        }
    }

    private fun Profile.toDraft(): ProfileDraft {
        return ProfileDraft(
            fullName = fullName.orEmpty(),
            currencyCode = currencyCode,
            monthlyGoal = monthlySavingsGoal.toInt().toString(),
            yearlyGoal = yearlySavingsGoal.toInt().toString(),
        )
    }

    private fun runTask(task: suspend () -> Unit) {
        viewModelScope.launch {
            state = state.copy(isLoading = true, message = null, error = null)
            runCatching { task() }
                .onSuccess { state = state.copy(isLoading = false) }
                .onFailure { state = state.copy(isLoading = false, error = it.message) }
        }
    }
}
