// src/app/api/booking/[bookingId]/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/supabaseAdmin";
import type { Database } from "@/types/supabase";

type BookingUpdate = Database["public"]["Tables"]["bookings"]["Update"];
type BookingRow    = Database["public"]["Tables"]["bookings"]["Row"];

// PATCH: aggiorna i campi (formData) per una prenotazione esistente
export async function PATCH(
  req: Request,
  { params }: { params: { bookingId: string } }
) {
  const id = params.bookingId; // UUID string

  const form = await req.formData();
  const getStr = (k: string) => (form.has(k) ? String(form.get(k)) : undefined);

  const data: BookingUpdate = {};

  const first = getStr("guest_firstname");
  if (first !== undefined) data.guest_firstname = first;

  const last = getStr("guest_lastname");
  if (last !== undefined) data.guest_lastname = last;

  const ci = getStr("check_in");
  if (ci !== undefined) data.check_in = new Date(ci).toISOString();

  const co = getStr("check_out");
  if (co !== undefined) data.check_out = new Date(co).toISOString();

  const pax = getStr("pax");
  if (pax !== undefined) data.pax = Number(pax);

  const price = getStr("price");
  if (price !== undefined) data.price = Number(price);

  const { data: row, error } = await supabaseAdmin
    .from("bookings")
    .update(data)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(row as BookingRow);
}

// DELETE: SOFT DELETE → imposta deleted_at (finisce nel Cestino per 30 giorni)
export async function DELETE(
  _req: Request,
  { params }: { params: { bookingId: string } }
) {
  const id = params.bookingId; // UUID string

  const patch: BookingUpdate = {
    // assicurati che la colonna esista in DB e nelle types
    // (se non l’hai ancora fatta: ALTER TABLE ... ADD COLUMN deleted_at timestamptz)
    deleted_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from("bookings")
    .update(patch)
    .eq("id", id)
    .select("id, deleted_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, id: data?.id, deleted_at: data?.deleted_at });
}
