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
  page: "#f8f5ef",
  card: "#fffdf8",
  border: "#dad3c7",
  text: "#2f3538",
  muted: "#717a7c",
  accent: "#3f9f96",
  accentHover: "#34857e",
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
  inputBg: "#141f35",
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
                  Ulangi password baru
                </span>
                <Input
                  type="password"
                  autoComplete="new-password"
                  placeholder="Tulis ulang password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
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
                {isBusy ? "Memproses..." : "Simpan password baru"}
              </button>
            </form>
          </section>
        </main>
      </div>
    </div>
  );
}
