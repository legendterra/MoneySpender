"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

// Boundary paling luar: menggantikan root layout saat layout itu sendiri
// gagal render, jadi wajib merender <html> dan <body> sendiri.
export default function GlobalError({
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
    <html lang="id">
      <body className="grid min-h-screen place-items-center p-6">
        <div className="max-w-lg space-y-4 text-center">
          <h1 className="text-3xl font-bold">Halaman tidak berhasil dimuat.</h1>
          <p className="text-sm leading-7">
            Tenang, data Anda tidak hilang. Coba muat ulang sekali lagi.
          </p>
          <button
            onClick={reset}
            className="rounded-md border px-4 py-2 text-sm font-semibold"
          >
            Coba lagi
          </button>
        </div>
      </body>
    </html>
  );
}
