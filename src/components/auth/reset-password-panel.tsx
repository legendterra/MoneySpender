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
  pagePattern?: string;
  card: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  accentHover: string;
  inputBg: string;
};

const lightPalette: AuthPalette = {
  page: "#f5f7ff",
  pagePattern:
    "linear-gradient(90deg, rgba(255,180,95,.2) 0 7rem, transparent 7rem), linear-gradient(180deg, rgba(90,61,240,.1) 0 13rem, transparent 13rem)",
  card: "#ffffff",
  border: "#dce3f5",
  text: "#14162f",
  muted: "#606987",
  accent: "#5a3df0",
  accentHover: "#412bd8",
  inputBg: "#f5f7ff",
};

const darkPalette: AuthPalette = {
  page: "#101326",
  pagePattern:
    "linear-gradient(90deg, rgba(255,196,119,.08) 0 7rem, transparent 7rem), linear-gradient(180deg, rgba(157,140,255,.1) 0 13rem, transparent 13rem)",
  card: "#171b33",
  border: "#303854",
  text: "#f5f6ff",
  muted: "#aab1cf",
  accent: "#9d8cff",
  accentHover: "#66b7ff",
  inputBg: "#202641",
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
        backgroundImage: palette.pagePattern,
      }}
    >
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-4 py-5 sm:px-5">
        <header className="flex items-center justify-between pb-1">
          <LogoMark
            className={
              isDark
                ? "[&_span:first-child]:text-[#9d8cff] [&_span:last-child]:text-[#f5f6ff]"
                : "[&_span:first-child]:text-[#5a3df0] [&_span:last-child]:text-[#14162f]"
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
            className="w-full rounded-[24px] border p-5 shadow-[0_12px_0_rgba(20,22,47,.04)] sm:p-6"
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
                  Ulangi password baru
                </span>
                <Input
                  type="password"
                  autoComplete="new-password"
                  placeholder="Tulis ulang password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
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
                {isBusy ? "Menyimpan..." : "Simpan password"}
              </button>
              <a
                href="https://moneyspender.net"
                className="block rounded-2xl border px-4 py-3 text-center text-sm font-bold transition hover:-translate-y-0.5"
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
