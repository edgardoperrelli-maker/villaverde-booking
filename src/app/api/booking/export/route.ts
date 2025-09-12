// src/app/api/booking/export/route.ts
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/supabaseAdmin";
import type { Database } from "@/types/supabase";

type BookingRow = Database["public"]["Tables"]["bookings"]["Row"];

// Riga del select con embed rooms(name)
// Se il nome del vincolo FK è diverso, sostituisci "bookings_room_id_fkey" nel select.
type BookingWithRoomName = Pick<
  BookingRow,
  | "id"
  | "room_id"
  | "check_in"
  | "check_out"
  | "pax"
  | "price"
  | "guest_firstname"
  | "guest_lastname"
  | "breakfast_done"
  | "payment_status"
> & {
  rooms: { name: string } | null;
};

function startOfDay(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function toISO(d: Date): string {
  return d.toISOString();
}

// Converte 'YYYY-MM-DD...' in 'DD/MM/YYYY' senza problemi di timezone
function toDMY(input: string): string {
  const ymd = String(input).slice(0, 10); // "YYYY-MM-DD"
  const [y, m, d] = ymd.split("-");
  return `${d}/${m}/${y}`;
}

type CsvRow = {
  id: BookingRow["id"];
  camera: string;        // nome camera o fallback a room_id
  ospite: string;
  check_in: string;      // DD/MM/YYYY
  check_out: string;     // DD/MM/YYYY
  pax: BookingRow["pax"];
  prezzo: string;        // 2 decimali, stringa per compat Excel
  colazione: "sì" | "no";
  stato_pagamento: "pagato" | "da pagare" | "n.d.";
};

function toCSV(rows: CsvRow[]): string {
  if (!rows.length) return "";
  const headers: (keyof CsvRow)[] = [
    "id",
    "camera",
    "ospite",
    "check_in",
    "check_out",
    "pax",
    "prezzo",
    "colazione",
    "stato_pagamento",
  ];
  const esc = (v: unknown) => `"${String(v ?? "").replaceAll('"', '""')}"`;
  const lines = [
    headers.join(","), // intestazioni in italiano
    ...rows.map((r) => headers.map((h) => esc(r[h])).join(",")),
  ];
  return lines.join("\n");
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const scope = url.searchParams.get("scope") ?? "today"; // today|past|future|range
  const from = url.searchParams.get("from");              // YYYY-MM-DD
  const to = url.searchParams.get("to");                  // YYYY-MM-DD

  const today = startOfDay();
  const startIso = toISO(today);

  let q = supabaseAdmin
    .from("bookings")
    .select(
      "id, room_id, check_in, check_out, pax, price, guest_firstname, guest_lastname, breakfast_done, payment_status, rooms!bookings_room_id_fkey(name)"
    )
    .order("check_in", { ascending: true });

  if (scope === "today") {
    q = q.lte("check_in", startIso).gt("check_out", startIso);
  } else if (scope === "past") {
    q = q.lt("check_out", startIso);
  } else if (scope === "future") {
    q = q.gt("check_in", startIso);
  } else if (scope === "range" && from && to) {
    const fromIso = new Date(from).toISOString();
    const toIso = new Date(to).toISOString();
    // Intersezione: check_out > from AND check_in < to
    q = q.gt("check_out", fromIso).lt("check_in", toIso);
  }

  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const rows: CsvRow[] = ((data ?? []) as BookingWithRoomName[]).map((b) => ({
    id: b.id,
    camera: b.rooms?.name ?? String(b.room_id),
    ospite: `${b.guest_firstname} ${b.guest_lastname}`,
    check_in: toDMY(b.check_in),
    check_out: toDMY(b.check_out),
    pax: b.pax,
    prezzo: typeof b.price === "number" ? b.price.toFixed(2) : "",
    colazione: b.breakfast_done ? "sì" : "no",
    stato_pagamento:
      b.payment_status === "PAID"
        ? "pagato"
        : b.payment_status === "DUE"
        ? "da pagare"
        : "n.d.",
  }));

  const csv = toCSV(rows);

  // Prepend BOM per compatibilità Excel e corretta visualizzazione di "sì"
  const body = "\uFEFF" + csv;

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="prenotazioni_${scope}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
