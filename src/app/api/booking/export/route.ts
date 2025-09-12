// src/app/api/booking/export/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/supabaseAdmin";
import type { Database } from "@/types/supabase";

type BookingRow = Database["public"]["Tables"]["bookings"]["Row"];

// Riga tipizzata del select con embed della relazione rooms(name).
// Se il nome del vincolo è diverso da "bookings_room_id_fkey",
// sostituiscilo anche nel select più sotto.
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

type CsvRow = {
  id: BookingRow["id"];
  room: string; // nome camera, fallback a room_id
  guest: string;
  check_in: string;  // YYYY-MM-DD
  check_out: string; // YYYY-MM-DD
  pax: BookingRow["pax"];
  price: BookingRow["price"];
  breakfast_done: "yes" | "no";
  payment_status: BookingRow["payment_status"];
};

function toCSV<T extends Record<string, unknown>>(rows: T[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]) as (keyof T)[];
  const esc = (v: unknown) => `"${String(v ?? "").replaceAll('"', '""')}"`;
  const lines = [
    headers.join(","),
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

  // Usa l'embed esplicito della relazione rooms tramite il nome del vincolo FK.
  // Se il tuo vincolo si chiama diversamente, sostituisci "bookings_room_id_fkey".
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
    room: b.rooms?.name ?? String(b.room_id),
    guest: `${b.guest_firstname} ${b.guest_lastname}`,
    check_in: new Date(b.check_in).toISOString().slice(0, 10),
    check_out: new Date(b.check_out).toISOString().slice(0, 10),
    pax: b.pax,
    price: b.price,
    breakfast_done: b.breakfast_done ? "yes" : "no",
    payment_status: b.payment_status,
  }));

  const csv = toCSV(rows);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="bookings_${scope}.csv"`
    }
  });
}
