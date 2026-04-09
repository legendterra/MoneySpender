package net.moneyspender.android.data

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.core.content.edit
import java.io.IOException
import java.time.LocalDate
import java.time.YearMonth
import java.time.format.DateTimeFormatter
import java.util.Locale
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObjectBuilder
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.logging.HttpLoggingInterceptor
import net.moneyspender.android.BuildConfig

private fun JsonObjectBuilder.put(name: String, value: String) {
    put(name, JsonPrimitive(value))
}

private fun JsonObjectBuilder.put(name: String, value: Boolean) {
    put(name, JsonPrimitive(value))
}

private fun JsonObjectBuilder.put(name: String, value: Double) {
    put(name, JsonPrimitive(value))
}

class MoneySpenderRepository(private val context: Context) {
    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }
    private val client = OkHttpClient.Builder()
        .addInterceptor(HttpLoggingInterceptor().apply { level = HttpLoggingInterceptor.Level.BASIC })
        .build()
    private val prefs = context.getSharedPreferences("moneyspender_android", Context.MODE_PRIVATE)
    private val jsonMedia = "application/json; charset=utf-8".toMediaType()

    private val defaultIncomeCategories = listOf("Gaji", "Freelance", "Bonus", "Investasi", "Penjualan")
    private val defaultExpenseCategories = listOf("Makan", "Transport", "Tagihan", "Belanja", "Keluarga", "Hiburan")
    private val defaultDebtCategories = listOf("Utang")
    private val isoDateFormatter: DateTimeFormatter = DateTimeFormatter.ISO_LOCAL_DATE
    private val displayDateFormatter: DateTimeFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy")

    fun getStoredSession(): AuthSession? {
        val raw = prefs.getString("session", null) ?: return null
        return runCatching { json.decodeFromString<AuthSession>(raw) }.getOrNull()
    }

    private fun saveSession(session: AuthSession?) {
        prefs.edit {
            if (session == null) remove("session") else putString("session", json.encodeToString(session))
        }
    }

    suspend fun bootstrap(): AuthUser? = withContext(Dispatchers.IO) {
        val session = getStoredSession() ?: return@withContext null
        val validSession = if (sessionExpired(session)) refreshSession(session.refreshToken) else session
        validSession ?: return@withContext null
        saveSession(validSession)
        fetchCurrentUser(validSession.accessToken)
    }

    suspend fun signIn(email: String, password: String): AuthUser = withContext(Dispatchers.IO) {
        val session = authPost(
            "/token?grant_type=password",
            buildJsonObject {
                put("email", email)
                put("password", password)
            },
        )
        saveSession(session)
        ensureUserSetup(session)
        session.user ?: fetchCurrentUser(session.accessToken)
    }

    suspend fun signUp(email: String, password: String, fullName: String): String = withContext(Dispatchers.IO) {
        authRaw(
            method = "POST",
            path = "/signup",
            body = buildJsonObject {
                put("email", email)
                put("password", password)
                put("data", buildJsonObject { put("full_name", fullName) })
            },
        )
        "Akun dibuat. Cek email untuk verifikasi."
    }

    suspend fun sendOtp(email: String): String = withContext(Dispatchers.IO) {
        authRaw(
            method = "POST",
            path = "/otp",
            body = buildJsonObject {
                put("email", email)
                put("create_user", true)
                put("email_redirect_to", redirectUrl())
            },
        )
        "OTP atau magic link sudah dikirim."
    }

    suspend fun verifyOtp(email: String, token: String): AuthUser = withContext(Dispatchers.IO) {
        val session = authPost(
            "/verify",
            buildJsonObject {
                put("email", email)
                put("token", token)
                put("type", "email")
            },
        )
        saveSession(session)
        ensureUserSetup(session)
        session.user ?: fetchCurrentUser(session.accessToken)
    }

    suspend fun sendResetPassword(email: String): String = withContext(Dispatchers.IO) {
        authRaw(
            method = "POST",
            path = "/recover",
            body = buildJsonObject {
                put("email", email)
                put("redirect_to", redirectUrl())
            },
        )
        "Link reset password sudah dikirim."
    }

    fun createGoogleIntent(): Intent {
        val uri = Uri.parse("${BuildConfig.SUPABASE_URL}/auth/v1/authorize")
            .buildUpon()
            .appendQueryParameter("provider", "google")
            .appendQueryParameter("redirect_to", redirectUrl())
            .build()
        return Intent(Intent.ACTION_VIEW, uri)
    }

    suspend fun handleIncomingUrl(url: String): AuthUser? = withContext(Dispatchers.IO) {
        if (!url.startsWith("${BuildConfig.DEEPLINK_SCHEME}://")) return@withContext null
        val parsed = Uri.parse(url)
        val fragmentParams = parsed.fragment
            ?.split("&")
            ?.mapNotNull {
                val pair = it.split("=")
                if (pair.size == 2) pair[0] to Uri.decode(pair[1]) else null
            }
            ?.toMap()
            .orEmpty()

        val accessToken = fragmentParams["access_token"] ?: parsed.getQueryParameter("access_token")
        val refreshToken = fragmentParams["refresh_token"] ?: parsed.getQueryParameter("refresh_token")
        val expiresIn = (fragmentParams["expires_in"] ?: parsed.getQueryParameter("expires_in"))?.toLongOrNull() ?: 3600L

        if (accessToken == null || refreshToken == null) return@withContext null

        val user = fetchCurrentUser(accessToken)
        val session = AuthSession(
            accessToken = accessToken,
            refreshToken = refreshToken,
            expiresIn = expiresIn,
            expiresAt = nowEpochSeconds() + expiresIn,
            user = user,
        )
        saveSession(session)
        ensureUserSetup(session)
        user
    }

    suspend fun completeRecovery(newPassword: String) = withContext(Dispatchers.IO) {
        val session = requireActiveSession()
        authRaw(
            method = "PUT",
            path = "/user",
            body = buildJsonObject { put("password", newPassword) },
            bearer = session.accessToken,
        )
    }

    suspend fun logout() = withContext(Dispatchers.IO) {
        getStoredSession()?.let { session ->
            runCatching {
                authRaw(
                    method = "POST",
                    path = "/logout",
                    body = buildJsonObject {},
                    bearer = session.accessToken,
                )
            }
        }
        saveSession(null)
    }

    suspend fun loadSnapshot(selectedMonth: String): AppSnapshot = withContext(Dispatchers.IO) {
        val session = requireActiveSession()
        val user = session.user ?: fetchCurrentUser(session.accessToken)
        ensureUserSetup(session.copy(user = user))

        val profile = fetchProfile(user.id, session.accessToken)
        val categories = fetchCategories(user.id, session.accessToken)
        val reminder = fetchReminder(user.id, session.accessToken)
        val transactions = fetchTransactions(user.id, session.accessToken)
        val debts = fetchDebts(user.id, session.accessToken)

        AppSnapshot(
            user = user,
            profile = profile,
            categories = categories,
            reminder = reminder,
            transactions = transactions,
            debts = debts,
            dashboard = buildDashboard(selectedMonth, profile, transactions, debts),
        )
    }

    suspend fun addTransaction(type: String, draft: TransactionDraft) = withContext(Dispatchers.IO) {
        val session = requireActiveSession()
        val user = session.user ?: fetchCurrentUser(session.accessToken)
        val category = fetchCategories(user.id, session.accessToken).firstOrNull { it.id == draft.categoryId }
        restWrite(
            method = "POST",
            path = "/transactions",
            body = buildJsonObject {
                put("user_id", user.id)
                put("amount", draft.amount.toDouble())
                put("type", type)
                put("category_id", draft.categoryId)
                put("category_label", category?.name ?: "")
                put("transaction_date", normalizeToIsoDate(draft.transactionDate))
                put("reason", draft.reason)
                put("merchant", draft.merchant)
                put("payment_method", draft.paymentMethod)
            },
            bearer = session.accessToken,
        )
    }

    suspend fun deleteTransaction(id: String) = withContext(Dispatchers.IO) {
        val session = requireActiveSession()
        restDelete("/transactions?id=eq.$id", session.accessToken)
    }

    suspend fun addDebt(draft: DebtDraft) = withContext(Dispatchers.IO) {
        val session = requireActiveSession()
        val user = session.user ?: fetchCurrentUser(session.accessToken)
        val debtCategory = fetchCategories(user.id, session.accessToken).firstOrNull { it.type == "debt" }
        restWrite(
            method = "POST",
            path = "/debts",
            body = buildJsonObject {
                put("user_id", user.id)
                put("amount", draft.amount.toDouble())
                put("debt_date", normalizeToIsoDate(draft.debtDate))
                put("source_name", draft.sourceName)
                put("lender_name", draft.lenderName)
                put("reason", draft.reason)
                put("category_id", debtCategory?.id ?: "")
                put("category_label", debtCategory?.name ?: "Utang")
            },
            bearer = session.accessToken,
        )
    }

    suspend fun markDebtPaid(id: String) = withContext(Dispatchers.IO) {
        val session = requireActiveSession()
        restWrite(
            method = "PATCH",
            path = "/debts?id=eq.$id",
            body = buildJsonObject {
                put("is_paid", true)
                put("paid_at", java.time.Instant.now().toString())
            },
            bearer = session.accessToken,
        )
    }

    suspend fun saveProfile(draft: ProfileDraft) = withContext(Dispatchers.IO) {
        val session = requireActiveSession()
        val user = session.user ?: fetchCurrentUser(session.accessToken)

        authRaw(
            method = "PUT",
            path = "/user",
            body = buildJsonObject {
                put("data", buildJsonObject {
                    put("full_name", draft.fullName)
                })
            },
            bearer = session.accessToken,
        )

        restWrite(
            method = "POST",
            path = "/profiles?on_conflict=id",
            body = buildJsonObject {
                put("id", user.id)
                put("full_name", draft.fullName)
                put("currency_code", draft.currencyCode.uppercase(Locale.ROOT))
                put("monthly_savings_goal", draft.monthlyGoal.toDoubleOrNull() ?: 0.0)
                put("yearly_savings_goal", draft.yearlyGoal.toDoubleOrNull() ?: 0.0)
            },
            bearer = session.accessToken,
            prefer = "resolution=merge-duplicates,return=representation",
        )
    }

    suspend fun saveReminder(reminder: ReminderPreferences) = withContext(Dispatchers.IO) {
        val session = requireActiveSession()
        val user = session.user ?: fetchCurrentUser(session.accessToken)
        restWrite(
            method = "POST",
            path = "/reminder_preferences?on_conflict=user_id",
            body = buildJsonObject {
                put("user_id", user.id)
                put("reminder_morning_enabled", reminder.reminderMorningEnabled)
                put("reminder_evening_enabled", reminder.reminderEveningEnabled)
                put("push_enabled", reminder.pushEnabled)
            },
            bearer = session.accessToken,
            prefer = "resolution=merge-duplicates,return=representation",
        )
    }

    suspend fun addCategory(draft: CategoryDraft) = withContext(Dispatchers.IO) {
        val session = requireActiveSession()
        val user = session.user ?: fetchCurrentUser(session.accessToken)
        val color = when (draft.type) {
            "income" -> "#82A5FF"
            "debt" -> "#FF8A8A"
            else -> "#4D84FF"
        }
        restWrite(
            method = "POST",
            path = "/categories",
            body = buildJsonObject {
                put("user_id", user.id)
                put("name", draft.name.trim())
                put("type", draft.type)
                put("color", color)
            },
            bearer = session.accessToken,
        )
    }

    suspend fun deleteCategory(id: String) = withContext(Dispatchers.IO) {
        val session = requireActiveSession()
        restDelete("/categories?id=eq.$id", session.accessToken)
    }

    suspend fun buildHistory(filter: HistoryFilter): List<HistoryItem> = withContext(Dispatchers.IO) {
        val snapshot = loadSnapshot(YearMonth.now().toString())
        val exactDate = filter.date.trim().takeIf { it.isNotBlank() }?.let(::normalizeToIsoDate)
        val transactions = snapshot.transactions.map {
            HistoryItem(
                id = it.id,
                source = "transaction",
                type = it.type,
                amount = it.amount,
                date = it.transactionDate,
                title = it.categoryLabel ?: if (it.type == "income") "Pemasukan" else "Pengeluaran",
                subtitle = it.reason ?: "Tanpa catatan tambahan",
                detail = listOfNotNull(it.merchant, it.paymentMethod).joinToString(" | ").ifBlank { null },
                statusLabel = if (it.type == "income") "Pemasukan" else "Pengeluaran",
            )
        }
        val debts = snapshot.debts.map {
            HistoryItem(
                id = it.id,
                source = "debt",
                type = "debt",
                amount = it.amount,
                date = it.debtDate,
                title = "Hutang ke ${it.lenderName}",
                subtitle = it.reason,
                detail = "Transaksi dari ${it.sourceName}",
                statusLabel = if (it.isPaid) "Lunas" else "Belum lunas",
            )
        }

        (transactions + debts)
            .filter { item ->
                val sameDate = exactDate == null || item.date == exactDate
                val sameYear = filter.year.isBlank() || item.date.startsWith(filter.year)
                val sameWeekday = if (filter.weekday == "all") true else {
                    LocalDate.parse(item.date).dayOfWeek.value % 7 == filter.weekday.toInt()
                }
                sameDate && sameYear && sameWeekday
            }
            .sortedWith(compareByDescending<HistoryItem> { it.date }.thenByDescending { it.amount })
    }

    private fun normalizeToIsoDate(value: String): String {
        val normalized = value.trim()
        if (normalized.isBlank()) {
            throw IOException("Tanggal wajib diisi dengan format DD/MM/YYYY.")
        }

        val parsedDate = runCatching { LocalDate.parse(normalized, isoDateFormatter) }.getOrNull()
            ?: runCatching { LocalDate.parse(normalized, displayDateFormatter) }.getOrNull()
            ?: throw IOException("Format tanggal harus DD/MM/YYYY.")

        return parsedDate.format(isoDateFormatter)
    }

    private suspend fun ensureUserSetup(session: AuthSession) {
        val user = session.user ?: fetchCurrentUser(session.accessToken)
        val accessToken = session.accessToken
        val profile = fetchProfile(user.id, accessToken, allowMissing = true)
        val reminder = fetchReminder(user.id, accessToken, allowMissing = true)
        val categories = fetchCategories(user.id, accessToken)

        if (profile.id == null) {
            restWrite(
                method = "POST",
                path = "/profiles?on_conflict=id",
                body = buildJsonObject {
                    put("id", user.id)
                    put("full_name", user.displayName())
                },
                bearer = accessToken,
                prefer = "resolution=merge-duplicates,return=representation",
            )
        }

        if (reminder.userId == null) {
            restWrite(
                method = "POST",
                path = "/reminder_preferences?on_conflict=user_id",
                body = buildJsonObject {
                    put("user_id", user.id)
                },
                bearer = accessToken,
                prefer = "resolution=merge-duplicates,return=representation",
            )
        }

        if (categories.isEmpty()) {
            val payload = buildJsonArray {
                defaultIncomeCategories.forEach { name ->
                    add(
                        buildJsonObject {
                            put("user_id", user.id)
                            put("name", name)
                            put("type", "income")
                            put("color", "#82A5FF")
                        },
                    )
                }
                defaultExpenseCategories.forEach { name ->
                    add(
                        buildJsonObject {
                            put("user_id", user.id)
                            put("name", name)
                            put("type", "expense")
                            put("color", "#4D84FF")
                        },
                    )
                }
                defaultDebtCategories.forEach { name ->
                    add(
                        buildJsonObject {
                            put("user_id", user.id)
                            put("name", name)
                            put("type", "debt")
                            put("color", "#FF8A8A")
                        },
                    )
                }
            }

            restWrite(
                method = "POST",
                path = "/categories?on_conflict=user_id,name,type",
                body = payload,
                bearer = accessToken,
                prefer = "resolution=merge-duplicates,return=representation",
            )
        }
    }

    private suspend fun fetchProfile(userId: String, bearer: String, allowMissing: Boolean = false): Profile {
        val response = restGet(
            "/profiles?select=id,full_name,currency_code,monthly_savings_goal,yearly_savings_goal&id=eq.$userId",
            bearer,
        )
        return if (response.trim() == "[]" && allowMissing) Profile()
        else json.decodeFromString<List<Profile>>(response).firstOrNull() ?: Profile()
    }

    private suspend fun fetchCategories(userId: String, bearer: String): List<Category> {
        val response = restGet("/categories?select=id,name,type,color&user_id=eq.$userId&order=name.asc", bearer)
        return json.decodeFromString(response)
    }

    private suspend fun fetchTransactions(userId: String, bearer: String): List<TransactionRecord> {
        val response = restGet(
            "/transactions?select=id,amount,type,transaction_date,reason,merchant,payment_method,category_label&user_id=eq.$userId&order=transaction_date.desc&order=created_at.desc",
            bearer,
        )
        return json.decodeFromString(response)
    }

    private suspend fun fetchDebts(userId: String, bearer: String): List<DebtRecord> {
        val response = restGet(
            "/debts?select=id,amount,debt_date,source_name,lender_name,reason,category_label,is_paid,paid_at&user_id=eq.$userId&order=debt_date.desc&order=created_at.desc",
            bearer,
        )
        return json.decodeFromString(response)
    }

    private suspend fun fetchReminder(userId: String, bearer: String, allowMissing: Boolean = false): ReminderPreferences {
        val response = restGet(
            "/reminder_preferences?select=user_id,reminder_morning_enabled,reminder_evening_enabled,push_enabled&user_id=eq.$userId",
            bearer,
        )
        return if (response.trim() == "[]" && allowMissing) ReminderPreferences()
        else json.decodeFromString<List<ReminderPreferences>>(response).firstOrNull() ?: ReminderPreferences()
    }

    private suspend fun fetchCurrentUser(accessToken: String): AuthUser {
        val request = Request.Builder()
            .url("${BuildConfig.SUPABASE_URL}/auth/v1/user")
            .addHeader("apikey", BuildConfig.SUPABASE_ANON_KEY)
            .addHeader("Authorization", "Bearer $accessToken")
            .get()
            .build()

        return client.newCall(request).execute().use { response ->
            val body = response.body?.string().orEmpty()
            if (!response.isSuccessful) throw IOException(extractError(body))
            json.decodeFromString(body)
        }
    }

    private suspend fun refreshSession(refreshToken: String): AuthSession? {
        return runCatching {
            authPost(
                "/token?grant_type=refresh_token",
                buildJsonObject { put("refresh_token", refreshToken) },
            )
        }.getOrNull()
    }

    private fun requireSession(): AuthSession {
        return getStoredSession() ?: throw IOException("Silakan login dulu.")
    }

    private suspend fun requireActiveSession(): AuthSession {
        val session = requireSession()
        val active = if (sessionExpired(session)) {
            refreshSession(session.refreshToken) ?: throw IOException("Sesi habis. Silakan login ulang.")
        } else {
            session
        }
        saveSession(active)
        return active
    }

    private fun sessionExpired(session: AuthSession): Boolean {
        val expiresAt = session.expiresAt ?: nowEpochSeconds() + session.expiresIn
        return nowEpochSeconds() >= expiresAt - 60
    }

    private fun nowEpochSeconds(): Long = System.currentTimeMillis() / 1000

    private fun redirectUrl(): String = "${BuildConfig.DEEPLINK_SCHEME}://${BuildConfig.DEEPLINK_HOST}/callback"

    private fun AuthUser.displayName(): String {
        val metadataName = userMetadata
            ?.get("full_name")
            ?.jsonPrimitive
            ?.contentOrNull
        return metadataName ?: email?.substringBefore("@") ?: "Pengguna"
    }

    private fun buildDashboard(
        selectedMonth: String,
        profile: Profile,
        transactions: List<TransactionRecord>,
        debts: List<DebtRecord>,
    ): DashboardSummary {
        val selected = YearMonth.parse(selectedMonth)
        val monthTransactions = transactions.filter { YearMonth.parse(it.transactionDate.take(7)) == selected }
        val yearTransactions = transactions.filter { it.transactionDate.startsWith(selected.year.toString()) }
        val income = monthTransactions.filter { it.type == "income" }.sumOf { it.amount }
        val expense = monthTransactions.filter { it.type == "expense" }.sumOf { it.amount }
        val balance = income - expense
        val savingsRate = if (income <= 0.0) 0 else (((income - expense) / income) * 100).toInt().coerceAtLeast(0)
        val unpaidDebts = debts.filterNot { it.isPaid }

        return DashboardSummary(
            income = income,
            expense = expense,
            balance = balance,
            savingsRate = savingsRate,
            monthlyGoal = profile.monthlySavingsGoal,
            yearlyGoal = profile.yearlySavingsGoal,
            yearBalance = yearTransactions.filter { it.type == "income" }.sumOf { it.amount } -
                yearTransactions.filter { it.type == "expense" }.sumOf { it.amount },
            totalOutstandingDebt = unpaidDebts.sumOf { it.amount },
            unpaidDebtCount = unpaidDebts.size,
            topIncome = monthTransactions.filter { it.type == "income" }.sortedByDescending { it.amount }.take(10),
            topExpense = monthTransactions.filter { it.type == "expense" }.sortedByDescending { it.amount }.take(10),
            recentDebts = unpaidDebts.take(5),
        )
    }

    private suspend fun authPost(path: String, body: JsonElement): AuthSession {
        val response = authRaw(method = "POST", path = path, body = body)
        return json.decodeFromString(response)
    }

    private suspend fun authRaw(
        method: String,
        path: String,
        body: JsonElement,
        bearer: String? = null,
    ): String {
        val request = Request.Builder()
            .url("${BuildConfig.SUPABASE_URL}/auth/v1$path")
            .addHeader("apikey", BuildConfig.SUPABASE_ANON_KEY)
            .apply {
                bearer?.let { addHeader("Authorization", "Bearer $it") }
            }
            .method(method, json.encodeToString(body).toRequestBody(jsonMedia))
            .build()

        return client.newCall(request).execute().use { response ->
            val responseBody = response.body?.string().orEmpty()
            if (!response.isSuccessful) throw IOException(extractError(responseBody))
            responseBody
        }
    }

    private suspend fun restGet(path: String, bearer: String): String {
        val request = Request.Builder()
            .url("${BuildConfig.SUPABASE_URL}/rest/v1$path")
            .addHeader("apikey", BuildConfig.SUPABASE_ANON_KEY)
            .addHeader("Authorization", "Bearer $bearer")
            .addHeader("Accept", "application/json")
            .get()
            .build()

        return client.newCall(request).execute().use { response ->
            val responseBody = response.body?.string().orEmpty()
            if (!response.isSuccessful) throw IOException(extractError(responseBody))
            responseBody
        }
    }

    private suspend fun restWrite(
        method: String,
        path: String,
        body: JsonElement,
        bearer: String,
        prefer: String = "return=representation",
    ) {
        val request = Request.Builder()
            .url("${BuildConfig.SUPABASE_URL}/rest/v1$path")
            .addHeader("apikey", BuildConfig.SUPABASE_ANON_KEY)
            .addHeader("Authorization", "Bearer $bearer")
            .addHeader("Content-Type", "application/json")
            .addHeader("Prefer", prefer)
            .method(method, json.encodeToString(body).toRequestBody(jsonMedia))
            .build()

        client.newCall(request).execute().use { response ->
            val responseBody = response.body?.string().orEmpty()
            if (!response.isSuccessful) throw IOException(extractError(responseBody))
        }
    }

    private suspend fun restDelete(path: String, bearer: String) {
        val request = Request.Builder()
            .url("${BuildConfig.SUPABASE_URL}/rest/v1$path")
            .addHeader("apikey", BuildConfig.SUPABASE_ANON_KEY)
            .addHeader("Authorization", "Bearer $bearer")
            .addHeader("Prefer", "return=representation")
            .delete()
            .build()

        client.newCall(request).execute().use { response ->
            val responseBody = response.body?.string().orEmpty()
            if (!response.isSuccessful) throw IOException(extractError(responseBody))
        }
    }

    private fun extractError(responseBody: String): String {
        return runCatching {
            val obj = json.parseToJsonElement(responseBody).jsonObject
            obj["msg"]?.jsonPrimitive?.contentOrNull
                ?: obj["error_description"]?.jsonPrimitive?.contentOrNull
                ?: obj["message"]?.jsonPrimitive?.contentOrNull
                ?: obj["error"]?.jsonPrimitive?.contentOrNull
                ?: responseBody
        }.getOrElse {
            responseBody.ifBlank { "Terjadi kesalahan jaringan." }
        }
    }
}
