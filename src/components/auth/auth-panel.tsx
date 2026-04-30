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
  page: "#f8f5ef",
  card: "#fffdf8",
  border: "#dad3c7",
  text: "#2f3538",
  muted: "#717a7c",
  accent: "#3f9f96",
  accentHover: "#34857e",
  link: "#2f9087",
  divider: "#d8d1c5",
  inputBg: "#fffdf8",
};

const darkPalette: AuthPalette = {
  page: "#080d1b",
  pagePattern:
    "radial-gradient(circle at 20% 20%, rgba(118, 156, 255, 0.18) 0, transparent 36%), radial-gradient(circle at 80% 8%, rgba(114, 88, 176, 0.18) 0, transparent 34%), radial-gradient(circle at 1px 1px, rgba(255,255,255,0.08) 1px, transparent 0)",
  card: "#121a2d",
  border: "#2d3856",
  text: "#eef2ff",
  muted: "#a6b3d4",
  accent: "#63d3b8",
  accentHover: "#4cb79e",
  link: "#9df5df",
  divider: "#344262",
  inputBg: "#141f35",
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
      className="h-[100dvh] overflow-hidden"
      style={{
        backgroundColor: palette.page,
        backgroundImage: palette.pagePattern,
        backgroundSize: isDark ? "auto, auto, 24px 24px" : undefined,
      }}
    >
      <div className="mx-auto flex h-full w-full max-w-md flex-col px-4 py-3 sm:px-5">
        <header className="flex items-center justify-between pb-1">
          <LogoMark
            className={
              isDark
                ? "[&_span:first-child]:text-[#9df5df] [&_span:last-child]:text-[#eef2ff]"
                : "[&_span:first-child]:text-[#3f9f96] [&_span:last-child]:text-[#2f3538]"
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
            className="w-full rounded-2xl border p-4 sm:p-5"
            style={{ borderColor: palette.border, backgroundColor: palette.card }}
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
                    className="min-h-11 rounded-xl"
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
                    className="min-h-11 rounded-xl"
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
                  className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition disabled:opacity-60"
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
                  className="w-full rounded-xl border px-4 py-2.5 text-sm font-semibold transition disabled:opacity-60"
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
                    className="min-h-11 rounded-xl"
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
                    className="min-h-11 rounded-xl"
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
                    className="min-h-11 rounded-xl"
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
                  className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition disabled:opacity-60"
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
                    className="min-h-11 rounded-xl"
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
                  className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition disabled:opacity-60"
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
