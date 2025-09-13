// src/app/api/booking/[bookingId]/cancel/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/supabaseAdmin';

// niente secondo argomento tipizzato: leggiamo l'ID direttamente dall'URL
export async function POST(req: Request) {
  const url = new URL(req.url);
  // URL atteso: /api/booking/<bookingId>/cancel
  const parts = url.pathname.split('/'); // ["","api","booking","<id>","cancel"]
  const i = parts.indexOf('booking');
  const bookingId = i >= 0 ? parts[i + 1] : '';

  if (!bookingId) {
    return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('bookings')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', bookingId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
