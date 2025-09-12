import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/supabaseAdmin";
import type { Database } from "@/types/supabase";

type BookingRow = Database["public"]["Tables"]["bookings"]["Row"];
type FlagsUpdate = Partial<Pick<BookingRow, "breakfast_done" | "payment_status">>;

export async function PATCH(
  req: Request,
  { params }: { params: { bookingId: string } }
) {
  try {
    const id = params.bookingId; // UUID (string)

    const body = (await req.json().catch(() => ({}))) as Partial<{
      breakfast_done: boolean;
      payment_status: BookingRow["payment_status"];
    }>;

    const data: FlagsUpdate = {};
    if (typeof body.breakfast_done === "boolean") data.breakfast_done = body.breakfast_done;
    if (body.payment_status) data.payment_status = body.payment_status;

    if (!Object.keys(data).length) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const { data: row, error } = await supabaseAdmin
      .from("bookings")
      .update(data)
      .eq("id", id)
      .select("id, breakfast_done, payment_status")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(row);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
