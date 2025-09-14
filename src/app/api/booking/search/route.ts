import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/supabaseAdmin';

// ---- Tipi locali (niente any) ----
type RoomRel = { name: string };
type RoomsSelect = RoomRel | RoomRel[] | null;

type BookingSelect = {
  id: string;
  room_id: string | number;
  check_in: string;    // ISO
  check_out: string;   // ISO
  pax: number | null;
  price: number | null;
  guest_firstname: string | null;
  guest_lastname: string | null;
  deleted_at: string | null;
  rooms: RoomsSelect;
};

type SearchResultRow = {
  id: string;
  room: string;
  guest: string;
  check_in: string;    // DD-MM-YYYY
  check_out: string;   // DD-MM-YYYY
  pax: number;
  price: string;       // es. "120.00"
};

// ---- Helpers ----
function toISODateStart(dateStr: string): string {
  // YYYY-MM-DD -> 00:00:00Z
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  return d.toISOString();
}
function toISODateEnd(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString();
}
function fmtDDMMYYYYDash(isoLike: string): string {
  const s = String(isoLike).slice(0, 10); // YYYY-MM-DD
  const [y, m, d] = s.split('-');
  return `${d}-${m}-${y}`;
}
function firstRoom(rooms: RoomsSelect): RoomRel | null {
  if (Array.isArray(rooms)) return rooms[0] ?? null;
  return rooms ?? null;
}

// ---- Handler ----
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = (url.searchParams.get('q') || '').trim();
    const date = (url.searchParams.get('date') || '').trim(); // YYYY-MM-DD

    let query = supabaseAdmin
      .from('bookings')
      .select(
        'id, room_id, check_in, check_out, pax, price, guest_firstname, guest_lastname, rooms(name), deleted_at'
      )
      .is('deleted_at', null) // esclude cestino
      .order('check_in', { ascending: false });

    // filtro testo (nome/cognome)
    if (q) {
      const pattern = `%${q}%`;
      query = query.or(
        `guest_lastname.ilike.${pattern},guest_firstname.ilike.${pattern}`
      );
    }

    // filtro giorno di arrivo come range [start, end)
    if (date) {
      const start = toISODateStart(date);
      const end = toISODateEnd(date);
      query = query.gte('check_in', start).lt('check_in', end);
    }

    // limiti sensati
    query = (!q && !date) ? query.limit(20) : query.limit(100);

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const rowsSrc: BookingSelect[] = (data ?? []) as BookingSelect[];
    const results: SearchResultRow[] = rowsSrc.map((b) => {
      const r = firstRoom(b.rooms);
      const guestFirst = b.guest_firstname ?? '';
      const guestLast = b.guest_lastname ?? '';
      return {
        id: b.id,
        room: r?.name ?? String(b.room_id),
        guest: `${guestFirst} ${guestLast}`.trim(),
        check_in: fmtDDMMYYYYDash(b.check_in),
        check_out: fmtDDMMYYYYDash(b.check_out),
        pax: Number(b.pax ?? 0),
        price: Number(b.price ?? 0).toFixed(2),
      };
    });

    return NextResponse.json({ results });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Search error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
