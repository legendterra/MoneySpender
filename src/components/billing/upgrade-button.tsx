"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

async function redirectToBillingUrl(endpoint: string) {
  const response = await fetch(endpoint, { method: "POST" });
  const data = (await response.json()) as { url?: string; error?: string };
  if (!response.ok || !data.url) {
    throw new Error(data.error ?? "Gagal membuka halaman pembayaran.");
  }
  window.location.assign(data.url);
}

export function UpgradeButton({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(false);

  return (
    <Button
      variant="primary"
      fullWidth
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        try {
          await redirectToBillingUrl("/api/billing/checkout");
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Terjadi kesalahan.");
          setLoading(false);
        }
      }}
    >
      {loading ? "Menyiapkan..." : children}
    </Button>
  );
}

export function ManageBillingButton({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(false);

  return (
    <Button
      variant="secondary"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        try {
          await redirectToBillingUrl("/api/billing/portal");
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Terjadi kesalahan.");
          setLoading(false);
        }
      }}
    >
      {loading ? "Membuka..." : children}
    </Button>
  );
}
