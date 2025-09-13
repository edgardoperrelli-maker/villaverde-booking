// src/app/api/booking/search/route.ts
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/supabaseAdmin";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const date = url.searchParams.get("date"); // YYYY-MM-DD

  let query = supabaseAdmin
    .from("bookings")
    .select("id, room_id, check_in, check_out, pax, price, guest_firstname, guest_lastname, rooms(name), deleted_at")
    .is("deleted_at", null)
    .order("check_in", { ascending: false })
    .limit(50);

  if (q) query = query.or(`guest_firstname.ilike.%${q}%,guest_lastname.ilike.%${q}%`);
  if (date) {
    const iso = new Date(date).toISOString();
    query = query.lte("check_in", iso).gt("check_out", iso);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data ?? []);
}
