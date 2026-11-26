// Shared by the server menu and the client sub-nav (plain module, no "use client").

export type SettingsSlug =
  | "profil"
  | "tampilan"
  | "tabungan"
  | "kategori"
  | "berulang"
  | "template"
  | "notifikasi"
  | "keamanan"
  | "data"
  | "pasang"
  | "akun";

/** Pengaturan sections in menu order. "pasang" opens the public /install guide. */
export const SETTINGS_SECTIONS: Array<{ slug: SettingsSlug; key: string; href: string }> = [
  { slug: "profil", key: "navProfile", href: "/settings/profil" },
  { slug: "tampilan", key: "navAppearance", href: "/settings/tampilan" },
  { slug: "tabungan", key: "navSavings", href: "/settings/tabungan" },
  { slug: "kategori", key: "navCategories", href: "/settings/kategori" },
  { slug: "berulang", key: "navRecurring", href: "/settings/berulang" },
  { slug: "template", key: "navTemplates", href: "/settings/template" },
  { slug: "notifikasi", key: "navNotifications", href: "/settings/notifikasi" },
  { slug: "keamanan", key: "navSecurity", href: "/settings/keamanan" },
  { slug: "data", key: "navData", href: "/settings/data" },
  { slug: "pasang", key: "navInstall", href: "/install" },
  { slug: "akun", key: "navAccount", href: "/settings/akun" },
];
