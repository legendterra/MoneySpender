import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current);
  return values.map((value) => value.trim());
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File CSV belum dipilih." }, { status: 400 });
  }

  const text = await file.text();
  const lines = text.split(/\r?\n/).filter(Boolean);

  if (lines.length < 2) {
    return NextResponse.json({ error: "CSV kosong." }, { status: 400 });
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());
  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });

  const imports = rows
    .map((row) => {
      const kind = (row.jenis || row.type || "").toLowerCase();
      const type = kind.includes("masuk") || kind === "income" ? "income" : "expense";
      const amount = Number(String(row.nominal || row.amount || "0").replace(/[^\d.-]/g, ""));
      const date = row.tanggal || row.date;

      return {
        user_id: user.id,
        type,
        amount,
        category_label: row.kategori || row.category || null,
        transaction_date: date,
        reason: row.catatan || row.note || row.reason || "Import CSV",
        merchant: row.detail || row.merchant || null,
        payment_method: row.metode || row.payment_method || null,
      };
    })
    .filter((row) => row.amount > 0 && /^\d{4}-\d{2}-\d{2}$/.test(row.transaction_date));

  if (!imports.length) {
    return NextResponse.json({ error: "Tidak ada baris valid. Tanggal harus format YYYY-MM-DD." }, { status: 400 });
  }

  const isPreview = new URL(request.url).searchParams.get("preview") === "1";

  if (isPreview) {
    return NextResponse.json({
      validRows: imports.length,
      skippedRows: rows.length - imports.length,
      preview: imports.slice(0, 10).map((row) => ({
        jenis: row.type,
        tanggal: row.transaction_date,
        nominal: row.amount,
        kategori: row.category_label,
        catatan: row.reason,
      })),
    });
  }

  const { error } = await supabase.from("transactions").insert(imports);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from("audit_logs").insert({
    user_id: user.id,
    action: "import_transactions",
    metadata: { count: imports.length },
  });

  return NextResponse.json({ imported: imports.length });
}
