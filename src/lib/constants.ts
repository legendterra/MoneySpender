export const APP_NAME = "MoneySpender";
export const APP_DESCRIPTION =
  "Tempat simpel buat nyatet uang masuk, uang keluar, hutang, dan target bulanan.";
export const DEFAULT_CURRENCY = "IDR";
export const APP_TIMEZONE = "Asia/Jakarta";
export const MORNING_SLOT_HOUR = 7;
export const EVENING_SLOT_HOUR = 19;
export const MONTHS_TO_SHOW = 6;

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/net-worth", label: "Net Worth" },
  { href: "/all-transactions", label: "Riwayat" },
  { href: "/income", label: "Pemasukan" },
  { href: "/expenses", label: "Pengeluaran" },
  { href: "/debts", label: "Hutang" },
  { href: "/settings", label: "Atur" },
] as const;

export const DEFAULT_INCOME_CATEGORIES = [
  // Kerja & usaha
  { name: "Gaji", color: "#3b82f6" },
  { name: "Freelance / Proyek", color: "#6366f1" },
  { name: "Bonus & THR", color: "#8b5cf6" },
  { name: "Komisi & Fee", color: "#a855f7" },
  { name: "Usaha / Jualan", color: "#ec4899" },
  // Passive & investasi
  { name: "Investasi & Dividen", color: "#14b8a6" },
  { name: "Bunga Tabungan", color: "#06b6d4" },
  { name: "Sewa Properti", color: "#0ea5e9" },
  // Transfer & lainnya
  { name: "Cashback & Reward", color: "#22c55e" },
  { name: "Hadiah & Kado", color: "#84cc16" },
  { name: "Transfer Masuk", color: "#f59e0b" },
  { name: "Lainnya", color: "#6b7280" },
] as const;

export const DEFAULT_EXPENSE_CATEGORIES = [
  // Kebutuhan pokok
  { name: "Makan & Minum", color: "#f97316" },
  { name: "Belanja Dapur", color: "#fb923c" },
  { name: "Kos / Sewa Rumah", color: "#ef4444" },
  { name: "Cicilan KPR / KTA", color: "#dc2626" },
  // Utilitas & tagihan
  { name: "Listrik & Air", color: "#eab308" },
  { name: "Internet & WiFi", color: "#ca8a04" },
  { name: "Pulsa & Paket Data", color: "#d97706" },
  { name: "Langganan (Netflix dll)", color: "#92400e" },
  // Transport
  { name: "Bensin", color: "#64748b" },
  { name: "Parkir & Tol", color: "#475569" },
  { name: "Ojek & Taksi Online", color: "#334155" },
  { name: "Angkutan Umum", color: "#1e293b" },
  // Kesehatan
  { name: "Kesehatan & Obat", color: "#10b981" },
  { name: "Gym & Olahraga", color: "#059669" },
  // Gaya hidup
  { name: "Kopi & Nongkrong", color: "#78350f" },
  { name: "Hiburan & Nonton", color: "#7c3aed" },
  { name: "Liburan & Travel", color: "#2563eb" },
  { name: "Belanja Pakaian", color: "#db2777" },
  { name: "Skincare & Kosmetik", color: "#be185d" },
  { name: "Gadget & Elektronik", color: "#0284c7" },
  // Keluarga & sosial
  { name: "Keluarga & Anak", color: "#16a34a" },
  { name: "Pendidikan", color: "#15803d" },
  { name: "Donasi & Sedekah", color: "#166534" },
  { name: "Asuransi", color: "#4d7c0f" },
  // Lainnya
  { name: "Lainnya", color: "#6b7280" },
] as const;

export const DEFAULT_DEBT_CATEGORIES = [
  { name: "Hutang Pribadi", color: "#ef4444" },
  { name: "Cicilan Bank / KTA", color: "#dc2626" },
  { name: "Pinjol", color: "#b91c1c" },
  { name: "Kartu Kredit", color: "#f59e0b" },
  { name: "Piutang", color: "#3b82f6" },
  { name: "Lainnya", color: "#6b7280" },
] as const;

export const WEEKDAY_OPTIONS = [
  { value: "all", label: "Semua Hari" },
  { value: "0", label: "Minggu" },
  { value: "1", label: "Senin" },
  { value: "2", label: "Selasa" },
  { value: "3", label: "Rabu" },
  { value: "4", label: "Kamis" },
  { value: "5", label: "Jumat" },
  { value: "6", label: "Sabtu" },
];
