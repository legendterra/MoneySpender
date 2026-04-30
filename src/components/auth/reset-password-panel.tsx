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
  page: "#f8f1ff",
  pagePattern:
    "radial-gradient(circle at 0% 0%, rgba(173,123,255,.34) 0 14rem, transparent 14.2rem), radial-gradient(circle at 100% 100%, rgba(255,186,112,.54) 0 17rem, transparent 17.2rem), radial-gradient(circle at 11% 94%, rgba(51,103,255,.34) 0 14rem, transparent 14.2rem), linear-gradient(135deg, #f8f1ff 0%, #eef6ff 38%, #fff3ef 100%)",
  card: "rgba(255,255,255,.58)",
  border: "rgba(255,255,255,.72)",
  text: "#11162f",
  muted: "#68708e",
  accent: "#5747ef",
  accentHover: "#4333d8",
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
  inputBg: "rgba(255,255,255,.08)",
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
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold" style={{ color: palette.text }}>
                Buat password baru
              </h1>
              <p className="text-[13px]" style={{ color: palette.muted }}>
                Simpan password baru untuk melanjutkan.
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
                {isBusy ? "Memproses..." : "Simpan password baru"}
              </button>
            </form>
          </section>
        </main>
      </div>
    </div>
  );
}
