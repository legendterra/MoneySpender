"use client";

import { useState } from "react";
import Link from "next/link";
import { HandCoins, Plus, TrendingDown, TrendingUp, X } from "lucide-react";

const actions = [
  { href: "/expenses#form", label: "Pengeluaran", icon: TrendingDown },
  { href: "/income#form", label: "Pemasukan", icon: TrendingUp },
  { href: "/debts#form", label: "Hutang", icon: HandCoins },
];

export function QuickAdd() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-[calc(5.6rem+env(safe-area-inset-bottom))] right-4 z-50 lg:bottom-6">
      {open ? (
        <div className="mb-3 grid gap-2">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                prefetch={false}
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center gap-2 rounded-2xl border border-border bg-background px-4 text-sm font-bold text-foreground shadow-[0_12px_30px_rgba(30,41,59,0.14)]"
              >
                <Icon className="size-4 text-accent-strong" />
                {action.label}
              </Link>
            );
          })}
        </div>
      ) : null}
      <button
        type="button"
        aria-label="Tambah cepat"
        onClick={() => setOpen((value) => !value)}
        className="grid size-14 place-items-center rounded-3xl bg-accent text-white shadow-[0_18px_34px_rgba(63,124,255,0.35)]"
      >
        {open ? <X className="size-6" /> : <Plus className="size-6" />}
      </button>
    </div>
  );
}
