// src/app/api/maintenance/purge-deleted/route.ts
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/supabaseAdmin";

export async function POST() {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { error, count } = await supabaseAdmin
    .from("bookings")
    .delete({ count: "exact" })
    .lt("deleted_at", cutoff)
    .not("deleted_at", "is", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, purged: count ?? 0 });
}

// comodo anche da browser
export async function GET() {
  return POST();
}
