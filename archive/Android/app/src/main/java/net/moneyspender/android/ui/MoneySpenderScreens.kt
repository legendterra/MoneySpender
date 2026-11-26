package net.moneyspender.android.ui

import net.moneyspender.android.viewmodel.AppTab

fun currentTitle(tab: AppTab): String =
    when (tab) {
        AppTab.Dashboard -> "Dashboard mobile"
        AppTab.Income -> "Pemasukan"
        AppTab.Expenses -> "Pengeluaran"
        AppTab.Debts -> "Hutang"
        AppTab.History -> "Riwayat transaksi"
        AppTab.Settings -> "Pengaturan"
    }

fun screenSubtitle(tab: AppTab): String =
    when (tab) {
        AppTab.Dashboard -> "Ringkasan bulan ini dibuat lebih hidup, rapih, dan mudah discan."
        AppTab.Income -> "Form pencatatan cepat supaya alur input tetap ringan di HP."
        AppTab.Expenses -> "Input pengeluaran dan histori disusun padat tapi tetap nyaman dibaca."
        AppTab.Debts -> "Pantau hutang aktif, tambah catatan baru, lalu lunasi tanpa ribet."
        AppTab.History -> "Semua pemasukan, pengeluaran, dan hutang ada dalam satu alur filter."
        AppTab.Settings -> "Kelola profil, kategori, reminder, dan keamanan akun dari aplikasi."
    }
