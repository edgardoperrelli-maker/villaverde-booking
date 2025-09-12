export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/supabaseAdmin";
import type { Database } from "@/types/supabase";

type BookingRow = Database["public"]["Tables"]["bookings"]["Row"];

type BookingWithRoomName = Pick<
  BookingRow,
  "id" | "room_id" | "check_in" | "check_out" | "pax" | "price" | "guest_firstname" | "guest_lastname"
> & { rooms: { name: string } | null };

// YYYY-MM-DD -> DD/MM/YYYY
function toDMY(input: string): string {
  const ymd = String(input).slice(0, 10);
  const [y, m, d] = ymd.split("-");
  return `${d}/${m}/${y}`;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();         // cognome
  const date = url.searchParams.get("date") ?? "";             // DD/MM/YYYY

  // Validazione semplice della data
  if (date && !/^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
    return NextResponse.json({ error: "Formato data non valido" }, { status: 400 });
  }

  let query = supabaseAdmin
    .from("bookings")
    .select(
      "id, room_id, check_in, check_out, pax, price, guest_firstname, guest_lastname, rooms!bookings_room_id_fkey(name)"
    )
    .order("check_in", { ascending: true })
    .limit(50);

  if (q) query = query.ilike("guest_lastname", `%${q}%`);
  if (date) query = query.eq("check_in", date);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const rows = ((data ?? []) as BookingWithRoomName[]).map((b) => ({
    id: b.id,
    room: b.rooms?.name ?? String(b.room_id),
    guest: `${b.guest_firstname} ${b.guest_lastname}`,
    check_in: toDMY(b.check_in),
    check_out: toDMY(b.check_out),
    pax: b.pax,
    price: typeof b.price === "number" ? b.price.toFixed(2) : "",
  }));

  return NextResponse.json({ results: rows });
}
