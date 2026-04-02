"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { KeyRound, LockKeyhole, Mail, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { LogoMark } from "@/components/logo-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type AuthTab = "signin" | "signup" | "code" | "reset";

const tabs: { id: AuthTab; label: string }[] = [
  { id: "signin", label: "Login" },
  { id: "signup", label: "Register" },
  { id: "code", label: "Kode Email" },
  { id: "reset", label: "Lupa Password" },
];

export function AuthPanel() {
  const router = useRouter();
  const [tab, setTab] = useState<AuthTab>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [otpToken, setOtpToken] = useState("");
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
    setTab("signin");
  }

  async function handleSendCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsBusy(true);
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: redirectTo,
      },
    });
    setIsBusy(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Kode atau link verifikasi sudah dikirim ke email.");
  }

  async function handleVerifyCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsBusy(true);
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otpToken,
      type: "email",
    });
    setIsBusy(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Verifikasi email berhasil.");
    router.replace("/dashboard");
    router.refresh();
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
    <div className="grid min-h-screen gap-6 px-4 py-5 sm:px-6 lg:grid-cols-[1.15fr_0.85fr]">
      <section className="flex flex-col justify-between rounded-[36px] border border-border bg-background-strong/85 p-6 shadow-[var(--shadow)] sm:p-8">
        <div className="space-y-8">
          <LogoMark />
          <div className="max-w-xl space-y-5">
            <p className="inline-flex items-center gap-2 rounded-full border border-border bg-accent-soft px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-accent-strong">
              <Sparkles className="size-4" />
              Laporan Keuangan Siap Pakai
            </p>
            <h1 className="text-4xl font-bold leading-tight text-foreground sm:text-6xl">
              Catat pemasukan dan pengeluaran dengan tampilan yang ringan, lembut, dan nyaman di mobile.
            </h1>
            <p className="max-w-lg text-sm leading-8 text-muted sm:text-base">
              Aplikasi ini sudah menyiapkan login email, OTP/link, Google, dashboard grafik,
              target menabung, kategori, reminder pagi dan malam, plus mode siang dan malam pastel.
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            "Dashboard bulanan yang rapi",
            "Form transaksi simpel dan cepat",
            "Siap dijalankan di web dan PWA mobile",
          ].map((item, index) => (
            <motion.div
              key={item}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index, duration: 0.24 }}
              className="rounded-[24px] border border-border bg-background p-4 text-sm leading-7 text-muted"
            >
              {item}
            </motion.div>
          ))}
        </div>
      </section>

      <Panel className="mx-auto flex w-full max-w-xl flex-col justify-center rounded-[36px] p-6 sm:p-8">
        <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                "rounded-2xl px-3 py-3 text-xs font-semibold transition sm:text-sm",
                tab === item.id
                  ? "bg-accent text-white shadow-[0_16px_38px_rgba(57,112,242,0.24)]"
                  : "bg-background text-muted hover:bg-accent-soft hover:text-foreground",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab === "signin" ? (
          <form className="space-y-4" onSubmit={handlePasswordLogin}>
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-foreground">Login</h2>
              <p className="text-sm leading-7 text-muted">
                Masuk dengan email dan password, atau pakai Google.
              </p>
            </div>
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <Button type="submit" fullWidth isLoading={isBusy}>
              <LockKeyhole className="size-4" />
              Login sekarang
            </Button>
          </form>
        ) : null}

        {tab === "signup" ? (
          <form className="space-y-4" onSubmit={handleSignUp}>
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-foreground">Register</h2>
              <p className="text-sm leading-7 text-muted">
                Buat akun baru. Sistem akan mengirim verifikasi email otomatis.
              </p>
            </div>
            <Input
              placeholder="Nama lengkap"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
            />
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <Button type="submit" fullWidth isLoading={isBusy}>
              Buat akun gratis
            </Button>
          </form>
        ) : null}

        {tab === "code" ? (
          <div className="space-y-4">
            <form className="space-y-4" onSubmit={handleSendCode}>
              <div className="space-y-2">
                <h2 className="text-3xl font-bold text-foreground">Kode Email</h2>
                <p className="text-sm leading-7 text-muted">
                  Kirim OTP atau magic link ke email. Bila template email OTP aktif, kode bisa langsung diisi di bawah.
                </p>
              </div>
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <Button type="submit" fullWidth variant="secondary" isLoading={isBusy}>
                <Mail className="size-4" />
                Kirim kode / link
              </Button>
            </form>
            <form
              className="space-y-4 rounded-[28px] border border-border bg-background p-4"
              onSubmit={handleVerifyCode}
            >
              <Input
                placeholder="Masukkan kode OTP email"
                value={otpToken}
                onChange={(event) => setOtpToken(event.target.value)}
              />
              <Button type="submit" fullWidth isLoading={isBusy}>
                <KeyRound className="size-4" />
                Verifikasi kode
              </Button>
            </form>
          </div>
        ) : null}

        {tab === "reset" ? (
          <form className="space-y-4" onSubmit={handleResetPassword}>
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-foreground">Lupa Password</h2>
              <p className="text-sm leading-7 text-muted">
                Kami kirim link reset ke email supaya Anda bisa set password baru dengan aman.
              </p>
            </div>
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <Button type="submit" fullWidth variant="secondary" isLoading={isBusy}>
              Kirim email reset
            </Button>
          </form>
        ) : null}

        <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-[0.24em] text-muted">
          <span className="h-px flex-1 bg-border" />
          OAuth
          <span className="h-px flex-1 bg-border" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Button type="button" variant="secondary" onClick={() => void handleGoogleLogin()}>
            G
            Login Google
          </Button>
        </div>

        <p className="mt-6 text-center text-xs leading-6 text-muted">
          Dengan melanjutkan, Anda bisa menghubungkan project ini ke Supabase dan deploy ke Vercel.
        </p>
      </Panel>
    </div>
  );
}
