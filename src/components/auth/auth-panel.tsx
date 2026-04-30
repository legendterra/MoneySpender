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
  pagePattern?: string;
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
  page: "#f8f1ff",
  pagePattern:
    "radial-gradient(circle at 0% 0%, rgba(173,123,255,.34) 0 14rem, transparent 14.2rem), radial-gradient(circle at 100% 100%, rgba(255,186,112,.54) 0 17rem, transparent 17.2rem), radial-gradient(circle at 11% 94%, rgba(51,103,255,.34) 0 14rem, transparent 14.2rem), linear-gradient(135deg, #f8f1ff 0%, #eef6ff 38%, #fff3ef 100%)",
  card: "rgba(255,255,255,.58)",
  border: "rgba(255,255,255,.72)",
  text: "#11162f",
  muted: "#68708e",
  accent: "#5747ef",
  accentHover: "#4333d8",
  link: "#5747ef",
  divider: "rgba(108,120,158,.24)",
  inputBg: "rgba(255,255,255,.38)",
};

const darkPalette: AuthPalette = {
  page: "#080b1c",
  pagePattern:
    "radial-gradient(circle at 0% 0%, rgba(118,86,255,.28) 0 14rem, transparent 14.2rem), radial-gradient(circle at 100% 100%, rgba(255,147,92,.22) 0 18rem, transparent 18.2rem), radial-gradient(circle at 8% 94%, rgba(52,96,255,.22) 0 15rem, transparent 15.2rem), linear-gradient(135deg, #080b1c 0%, #101834 46%, #170f23 100%)",
  card: "rgba(20,25,54,.72)",
  border: "rgba(178,189,255,.18)",
  text: "#f4f6ff",
  muted: "#a6aecb",
  accent: "#7567ff",
  accentHover: "#55b8ff",
  link: "#a79cff",
  divider: "rgba(178,189,255,.18)",
  inputBg: "rgba(255,255,255,.08)",
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
      className="min-h-[100dvh] overflow-hidden"
      style={{
        backgroundColor: palette.page,
        backgroundImage: palette.pagePattern,
      }}
    >
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-4 py-5 sm:px-5">
        <header className="flex items-center justify-between pb-1">
          <LogoMark
            className={
              isDark
                ? "[&_span:first-child]:text-[#a79cff] [&_span:last-child]:text-[#f4f6ff]"
                : "[&_span:first-child]:text-[#5747ef] [&_span:last-child]:text-[#11162f]"
            }
          />
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
            className="w-full rounded-[24px] border-2 p-5 shadow-[0_22px_70px_rgba(54,74,155,.2)] backdrop-blur-[22px] sm:p-6"
            style={{ borderColor: palette.border, background: palette.card }}
          >
            {mode === "signin" ? (
              <form className="space-y-3" onSubmit={handlePasswordLogin}>
                <div className="space-y-1">
                  <h1 className="text-2xl font-semibold" style={{ color: palette.text }}>
                    Login
                  </h1>
                  <p className="text-[13px]" style={{ color: palette.muted }}>
                    Masuk cepat dengan email dan password.
                  </p>
                </div>

                <label className="grid gap-1.5">
                  <span className="text-sm font-medium" style={{ color: palette.text }}>
                    Email
                  </span>
                  <Input
                    type="email"
                    autoComplete="email"
                    placeholder="you@email.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="min-h-11 rounded-2xl"
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
                    placeholder="Masukkan password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="min-h-11 rounded-2xl"
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
                  className="w-full rounded-full px-4 py-3 text-sm font-bold text-white shadow-[0_18px_48px_rgba(57,74,216,.3)] transition disabled:opacity-60"
                  style={{ backgroundColor: isBusy ? palette.accentHover : palette.accent }}
                >
                  {isBusy ? "Memproses..." : "Login"}
                </button>

                <p className="text-center text-sm" style={{ color: palette.muted }}>
                  Belum punya akun?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("signup")}
                    className="font-semibold underline-offset-4 hover:underline"
                    style={{ color: palette.link }}
                  >
                    Register
                  </button>
                </p>

                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em]" style={{ color: palette.muted }}>
                  <span className="h-px flex-1" style={{ backgroundColor: palette.divider }} />
                  Or login with Google
                  <span className="h-px flex-1" style={{ backgroundColor: palette.divider }} />
                </div>

                <button
                  type="button"
                  onClick={() => void handleGoogleLogin()}
                  disabled={isBusy}
                  className="w-full rounded-full border px-4 py-3 text-sm font-bold transition disabled:opacity-60"
                  style={{ borderColor: palette.border, color: palette.text, backgroundColor: palette.card }}
                >
                  Login with Google
                </button>
              </form>
            ) : null}

            {mode === "signup" ? (
              <form className="space-y-3" onSubmit={handleSignUp}>
                <div className="space-y-1">
                  <h1 className="text-2xl font-semibold" style={{ color: palette.text }}>
                    Register
                  </h1>
                  <p className="text-[13px]" style={{ color: palette.muted }}>
                    Buat akun baru dan lanjutkan verifikasi email.
                  </p>
                </div>

                <label className="grid gap-1.5">
                  <span className="text-sm font-medium" style={{ color: palette.text }}>
                    Nama lengkap
                  </span>
                  <Input
                    autoComplete="name"
                    placeholder="Nama lengkap"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    className="min-h-11 rounded-2xl"
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
                    placeholder="you@email.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="min-h-11 rounded-2xl"
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
                    className="min-h-11 rounded-2xl"
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
                  className="w-full rounded-full px-4 py-3 text-sm font-bold text-white shadow-[0_18px_48px_rgba(57,74,216,.3)] transition disabled:opacity-60"
                  style={{ backgroundColor: isBusy ? palette.accentHover : palette.accent }}
                >
                  {isBusy ? "Memproses..." : "Buat akun"}
                </button>

                <p className="text-center text-sm" style={{ color: palette.muted }}>
                  Sudah punya akun?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("signin")}
                    className="font-semibold underline-offset-4 hover:underline"
                    style={{ color: palette.link }}
                  >
                    Login
                  </button>
                </p>
              </form>
            ) : null}

            {mode === "forgot" ? (
              <form className="space-y-3" onSubmit={handleResetPassword}>
                <div className="space-y-1">
                  <h1 className="text-2xl font-semibold" style={{ color: palette.text }}>
                    Lupa Password
                  </h1>
                  <p className="text-[13px]" style={{ color: palette.muted }}>
                    Masukkan email akun. Kami kirim tautan reset.
                  </p>
                </div>

                <label className="grid gap-1.5">
                  <span className="text-sm font-medium" style={{ color: palette.text }}>
                    Email
                  </span>
                  <Input
                    type="email"
                    autoComplete="email"
                    placeholder="you@email.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="min-h-11 rounded-2xl"
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
                  className="w-full rounded-full px-4 py-3 text-sm font-bold text-white shadow-[0_18px_48px_rgba(57,74,216,.3)] transition disabled:opacity-60"
                  style={{ backgroundColor: isBusy ? palette.accentHover : palette.accent }}
                >
                  {isBusy ? "Memproses..." : "Kirim link reset"}
                </button>

                <div className="flex items-center justify-between text-sm" style={{ color: palette.muted }}>
                  <button
                    type="button"
                    onClick={() => setMode("signin")}
                    className="underline-offset-4 hover:underline"
                    style={{ color: palette.link }}
                  >
                    Kembali ke login
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("signup")}
                    className="underline-offset-4 hover:underline"
                    style={{ color: palette.link }}
                  >
                    Register
                  </button>
                </div>
              </form>
            ) : null}
          </section>
        </main>
      </div>
    </div>
  );
}
