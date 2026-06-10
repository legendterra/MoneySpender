"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { toast } from "sonner";

import { LogoMark } from "@/components/logo-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { Input } from "@/components/ui/input";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type AuthMode = "signin" | "signup" | "forgot";

type AuthPalette = {
  page: string;
  card: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  accentHover: string;
  link: string;
  divider: string;
  inputBg: string;
};

const lightPalette: AuthPalette = {
  page: "#f6f7f9",
  card: "#ffffff",
  border: "#d9dde3",
  text: "#111318",
  muted: "#626975",
  accent: "#2563eb",
  accentHover: "#1d4ed8",
  link: "#1d4ed8",
  divider: "#d9dde3",
  inputBg: "#f6f7f9",
};

const darkPalette: AuthPalette = {
  page: "#0f1115",
  card: "#171a20",
  border: "#303640",
  text: "#f4f6f8",
  muted: "#9da4af",
  accent: "#6f9cff",
  accentHover: "#8bb0ff",
  link: "#8bb0ff",
  divider: "#303640",
  inputBg: "#20242c",
};

export function AuthPanel() {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  const isDark = mounted && resolvedTheme === "dark";
  const palette = isDark ? darkPalette : lightPalette;

  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  const redirectTo = useMemo(() => {
    if (typeof window === "undefined") {
      return "";
    }

    return `${window.location.origin}/auth/callback?next=/dashboard`;
  }, []);

  async function handlePasswordLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsBusy(true);
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setIsBusy(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Berhasil login.");
    router.replace("/dashboard");
    router.refresh();
  }

  async function handleSignUp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsBusy(true);
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo,
        data: {
          full_name: fullName,
        },
      },
    });
    setIsBusy(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Akun dibuat. Cek email Anda untuk verifikasi.");
    setMode("signin");
  }

  async function handleResetPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsBusy(true);
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo:
        typeof window === "undefined"
          ? ""
          : `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    setIsBusy(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Link reset password sudah dikirim ke email.");
  }

  async function handleGoogleLogin() {
    setIsBusy(true);
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
      },
    });
    setIsBusy(false);

    if (error) {
      toast.error(error.message);
    }
  }

  return (
    <div
      className="min-h-[100dvh]"
      style={{
        backgroundColor: palette.page,
      }}
    >
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-4 py-5 sm:px-5">
        <header className="flex items-center justify-between pb-1">
          <LogoMark />
          <ThemeToggle
            className="h-9 w-9 rounded-lg"
            style={{
              borderColor: palette.border,
              backgroundColor: palette.card,
              color: palette.text,
            }}
          />
        </header>

        <main className="flex flex-1 items-center justify-center">
          <section
            className="w-full rounded-lg border p-5 sm:p-6"
            style={{ borderColor: palette.border, background: palette.card }}
          >
            {mode === "signin" ? (
              <form className="space-y-3" onSubmit={handlePasswordLogin}>
                <div className="space-y-1">
                  <h1 className="text-2xl font-semibold" style={{ color: palette.text }}>
                    Masuk ke MoneySpender
                  </h1>
                  <p className="text-[13px]" style={{ color: palette.muted }}>
                    Lanjutkan catatan uangmu dari email atau Google.
                  </p>
                </div>

                <label className="grid gap-1.5">
                  <span className="text-sm font-medium" style={{ color: palette.text }}>
                    Email
                  </span>
                  <Input
                    type="email"
                    autoComplete="email"
                    placeholder="nama@email.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="min-h-11 rounded-md"
                    style={{
                      borderColor: palette.border,
                      backgroundColor: palette.inputBg,
                      color: palette.text,
                    }}
                  />
                </label>

                <label className="grid gap-1.5">
                  <span className="text-sm font-medium" style={{ color: palette.text }}>
                    Password
                  </span>
                  <Input
                    type="password"
                    autoComplete="current-password"
                    placeholder="Password kamu"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="min-h-11 rounded-md"
                    style={{
                      borderColor: palette.border,
                      backgroundColor: palette.inputBg,
                      color: palette.text,
                    }}
                  />
                </label>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setMode("forgot")}
                    className="text-sm underline-offset-4 hover:underline"
                    style={{ color: palette.link }}
                  >
                    Lupa password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isBusy}
                  className="w-full rounded-md border border-transparent px-4 py-3 text-sm font-semibold text-white transition-colors disabled:opacity-60"
                  style={{ backgroundColor: isBusy ? palette.accentHover : palette.accent }}
                >
                  {isBusy ? "Sebentar..." : "Masuk"}
                </button>

                <p className="text-center text-sm" style={{ color: palette.muted }}>
                  Baru di sini?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("signup")}
                    className="font-semibold underline-offset-4 hover:underline"
                    style={{ color: palette.link }}
                  >
                    Daftar dulu
                  </button>
                </p>

                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em]" style={{ color: palette.muted }}>
                  <span className="h-px flex-1" style={{ backgroundColor: palette.divider }} />
                  Atau pakai Google
                  <span className="h-px flex-1" style={{ backgroundColor: palette.divider }} />
                </div>

                <button
                  type="button"
                  onClick={() => void handleGoogleLogin()}
                  disabled={isBusy}
                  className="w-full rounded-md border px-4 py-3 text-sm font-semibold transition-colors disabled:opacity-60"
                  style={{ borderColor: palette.border, color: palette.text, backgroundColor: palette.card }}
                >
                  Masuk dengan Google
                </button>
                <a
                  href="https://moneyspender.net"
                  className="block rounded-md border px-4 py-3 text-center text-sm font-semibold transition-colors"
                  style={{ borderColor: palette.border, color: palette.link, backgroundColor: palette.inputBg }}
                >
                  Ganti aplikasi di MoneySpender
                </a>
              </form>
            ) : null}

            {mode === "signup" ? (
              <form className="space-y-3" onSubmit={handleSignUp}>
                <div className="space-y-1">
                  <h1 className="text-2xl font-semibold" style={{ color: palette.text }}>
                    Bikin akun baru
                  </h1>
                  <p className="text-[13px]" style={{ color: palette.muted }}>
                    Daftar sekali, lalu catatanmu bisa lanjut di perangkat lain.
                  </p>
                </div>

                <label className="grid gap-1.5">
                  <span className="text-sm font-medium" style={{ color: palette.text }}>
                    Nama lengkap
                  </span>
                  <Input
                    autoComplete="name"
                    placeholder="Nama kamu"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    className="min-h-11 rounded-md"
                    style={{
                      borderColor: palette.border,
                      backgroundColor: palette.inputBg,
                      color: palette.text,
                    }}
                  />
                </label>

                <label className="grid gap-1.5">
                  <span className="text-sm font-medium" style={{ color: palette.text }}>
                    Email
                  </span>
                  <Input
                    type="email"
                    autoComplete="email"
                    placeholder="nama@email.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="min-h-11 rounded-md"
                    style={{
                      borderColor: palette.border,
                      backgroundColor: palette.inputBg,
                      color: palette.text,
                    }}
                  />
                </label>

                <label className="grid gap-1.5">
                  <span className="text-sm font-medium" style={{ color: palette.text }}>
                    Password
                  </span>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    placeholder="Minimal 8 karakter"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="min-h-11 rounded-md"
                    style={{
                      borderColor: palette.border,
                      backgroundColor: palette.inputBg,
                      color: palette.text,
                    }}
                  />
                </label>

                <button
                  type="submit"
                  disabled={isBusy}
                  className="w-full rounded-md border border-transparent px-4 py-3 text-sm font-semibold text-white transition-colors disabled:opacity-60"
                  style={{ backgroundColor: isBusy ? palette.accentHover : palette.accent }}
                >
                  {isBusy ? "Sebentar..." : "Daftar"}
                </button>

                <p className="text-center text-sm" style={{ color: palette.muted }}>
                  Sudah punya akun?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("signin")}
                    className="font-semibold underline-offset-4 hover:underline"
                    style={{ color: palette.link }}
                  >
                    Masuk
                  </button>
                </p>
                <a
                  href="https://moneyspender.net"
                  className="block rounded-md border px-4 py-3 text-center text-sm font-semibold transition-colors"
                  style={{ borderColor: palette.border, color: palette.link, backgroundColor: palette.inputBg }}
                >
                  Kembali ke pilihan aplikasi
                </a>
              </form>
            ) : null}

            {mode === "forgot" ? (
              <form className="space-y-3" onSubmit={handleResetPassword}>
                <div className="space-y-1">
                  <h1 className="text-2xl font-semibold" style={{ color: palette.text }}>
                    Reset password
                  </h1>
                  <p className="text-[13px]" style={{ color: palette.muted }}>
                    Tulis email akunmu. Link reset akan dikirim ke sana.
                  </p>
                </div>

                <label className="grid gap-1.5">
                  <span className="text-sm font-medium" style={{ color: palette.text }}>
                    Email
                  </span>
                  <Input
                    type="email"
                    autoComplete="email"
                    placeholder="nama@email.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="min-h-11 rounded-md"
                    style={{
                      borderColor: palette.border,
                      backgroundColor: palette.inputBg,
                      color: palette.text,
                    }}
                  />
                </label>

                <button
                  type="submit"
                  disabled={isBusy}
                  className="w-full rounded-md border border-transparent px-4 py-3 text-sm font-semibold text-white transition-colors disabled:opacity-60"
                  style={{ backgroundColor: isBusy ? palette.accentHover : palette.accent }}
                >
                  {isBusy ? "Mengirim..." : "Kirim link reset"}
                </button>

                <div className="flex items-center justify-between text-sm" style={{ color: palette.muted }}>
                  <button
                    type="button"
                    onClick={() => setMode("signin")}
                    className="underline-offset-4 hover:underline"
                    style={{ color: palette.link }}
                  >
                    Balik ke login
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("signup")}
                    className="underline-offset-4 hover:underline"
                    style={{ color: palette.link }}
                  >
                    Daftar
                  </button>
                </div>
                <a
                  href="https://moneyspender.net"
                  className="block rounded-md border px-4 py-3 text-center text-sm font-semibold transition-colors"
                  style={{ borderColor: palette.border, color: palette.link, backgroundColor: palette.inputBg }}
                >
                  Pilih aplikasi lain
                </a>
              </form>
            ) : null}
          </section>
        </main>
      </div>
    </div>
  );
}
