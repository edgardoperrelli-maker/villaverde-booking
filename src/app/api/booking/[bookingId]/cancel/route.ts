import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/supabaseAdmin";

export async function POST(
  _req: Request,
  { params }: { params: { bookingId: string } }
) {
  const id = params.bookingId;

  const { data, error } = await supabaseAdmin
    .from("bookings")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, deleted_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true, ...data });
}
