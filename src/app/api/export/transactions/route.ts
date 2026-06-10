import { NextResponse, type NextRequest } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

type ExportRow = {
  kind: string;
  date: string;
  amount: number;
  paid_amount?: number;
  remaining_amount?: number;
  status: string;
  category: string;
  wallet?: string;
  note: string;
  detail: string;
};

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function rowMatches(row: ExportRow, filters: { q: string; date: string; weekday: string; year: string }) {
  if (filters.date && row.date !== filters.date) {
    return false;
  }

  if (filters.year && row.date.slice(0, 4) !== filters.year) {
    return false;
  }

  if (filters.weekday !== "all") {
    const day = new Date(`${row.date}T00:00:00`).getDay().toString();
    if (day !== filters.weekday) {
      return false;
    }
  }

  if (filters.q) {
    const haystack = Object.values(row).join(" ").toLowerCase();
    return haystack.includes(filters.q);
  }

  return true;
}

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const filters = {
    q: (params.get("q") ?? "").trim().toLowerCase(),
    date: params.get("date") ?? "",
    weekday: params.get("weekday") ?? "all",
    year: params.get("year") ?? "",
  };

  const [transactionsResult, debtsResult] = await Promise.all([
    supabase
      .from("transactions")
      .select("amount,type,transaction_date,reason,merchant,payment_method,category_label")
      .eq("user_id", user.id)
      .order("transaction_date", { ascending: false }),
    supabase
      .from("debts")
      .select("amount,paid_amount,debt_date,source_name,lender_name,reason,category_label,is_paid")
      .eq("user_id", user.id)
      .order("debt_date", { ascending: false }),
  ]);

  if (transactionsResult.error || debtsResult.error) {
    return NextResponse.json(
      { error: transactionsResult.error?.message ?? debtsResult.error?.message },
      { status: 500 },
    );
  }

  const rows: ExportRow[] = [
    ...(transactionsResult.data ?? []).map((item) => ({
      kind: item.type === "income" ? "pemasukan" : "pengeluaran",
      date: item.transaction_date,
      amount: Number(item.amount ?? 0),
      status: "tersimpan",
      category: item.category_label ?? "",
      wallet: "",
      note: item.reason ?? "",
      detail: [item.merchant, item.payment_method].filter(Boolean).join(" | "),
    })),
    ...(debtsResult.data ?? []).map((item) => {
      const amount = Number(item.amount ?? 0);
      const paidAmount = Math.min(amount, Number(item.paid_amount ?? 0));

      return {
        kind: "hutang",
        date: item.debt_date,
        amount,
        paid_amount: paidAmount,
        remaining_amount: Math.max(0, amount - paidAmount),
        status: item.is_paid ? "lunas" : "belum lunas",
        category: item.category_label ?? "Utang",
        note: item.reason ?? "",
        detail: `Dari ${item.source_name ?? ""} ke ${item.lender_name ?? ""}`,
      };
    }),
  ].filter((row) => rowMatches(row, filters));

  const header = ["jenis", "tanggal", "nominal", "sudah_dibayar", "sisa_hutang", "status", "kategori", "dompet", "catatan", "detail"];
  const body = rows.map((row) =>
    [
      row.kind,
      row.date,
      row.amount,
      row.paid_amount ?? "",
      row.remaining_amount ?? "",
      row.status,
      row.category,
      row.wallet ?? "",
      row.note,
      row.detail,
    ]
      .map(csvEscape)
      .join(","),
  );

  return new NextResponse([header.join(","), ...body].join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="moneyspender-export-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
