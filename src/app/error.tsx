"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
    console.error(error);
  }, [error]);

  return (
    <div className="grid min-h-screen place-items-center p-6">
      <Panel className="max-w-lg space-y-4 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-accent-strong">
          Terjadi gangguan
        </p>
        <h1 className="text-3xl font-bold text-foreground">Halaman tidak berhasil dimuat.</h1>
        <p className="text-sm leading-7 text-muted">
          Tenang, data Anda tidak hilang. Coba muat ulang area ini sekali lagi.
        </p>
        {/* In production Next.js replaces server error messages; the digest matches the server log line. */}
        <p className="break-words text-xs leading-6 text-muted">
          {error.message}
          {error.digest ? ` (ref ${error.digest})` : ""}
        </p>
        <Button onClick={reset} fullWidth>
          Coba lagi
        </Button>
      </Panel>
    </div>
  );
}
