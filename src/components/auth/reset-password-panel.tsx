"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { toast } from "sonner";

import { LogoMark } from "@/components/logo-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { Input } from "@/components/ui/input";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type AuthPalette = {
  page: string;
  card: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  accentHover: string;
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
  inputBg: "#20242c",
};

export function ResetPasswordPanel() {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  const isDark = mounted && resolvedTheme === "dark";
  const palette = isDark ? darkPalette : lightPalette;

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password.length < 8) {
      toast.error("Password minimal 8 karakter.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Konfirmasi password belum sama.");
      return;
    }

    setIsBusy(true);
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.auth.updateUser({ password });
    setIsBusy(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Password berhasil diubah.");
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <div
      className="min-h-[100dvh] overflow-hidden"
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
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold" style={{ color: palette.text }}>
                Password baru
              </h1>
              <p className="text-[13px]" style={{ color: palette.muted }}>
                Bikin password yang gampang kamu ingat, tapi susah ditebak orang lain.
              </p>
            </div>

            <form className="mt-3 space-y-3" onSubmit={handleSubmit}>
              <label className="grid gap-1.5">
                <span className="text-sm font-medium" style={{ color: palette.text }}>
                  Password baru
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

              <label className="grid gap-1.5">
                <span className="text-sm font-medium" style={{ color: palette.text }}>
                  Ulangi password baru
                </span>
                <Input
                  type="password"
                  autoComplete="new-password"
                  placeholder="Tulis ulang password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
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
                {isBusy ? "Menyimpan..." : "Simpan password"}
              </button>
              <a
                href="https://moneyspender.net"
                className="block rounded-md border px-4 py-3 text-center text-sm font-semibold transition-colors"
                style={{ borderColor: palette.border, color: palette.accent, backgroundColor: palette.inputBg }}
              >
                Kembali ke pilihan aplikasi
              </a>
            </form>
          </section>
        </main>
      </div>
    </div>
  );
}
