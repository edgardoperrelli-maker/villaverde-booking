import 'server-only';
import { supabaseAdmin } from '@/supabaseAdmin';

/** Tipi condivisi */
export type PaymentStatus = 'DUE' | 'PAID' | 'NA';

export type InHouseRow = {
  id: string;
  room_id: number | string;
  pax: number;
  guest_firstname: string;
  guest_lastname: string;
  breakfast_done: boolean | null;
  rooms: { name: string } | null;
};

export type DepartureRow = {
  id: string;
  room_id: number | string;
  guest_firstname: string;
  guest_lastname: string;
  payment_status: PaymentStatus;
  rooms: { name: string } | null;
};

export function startOfDay(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

/** Helper per normalizzare l’embed rooms che può arrivare come oggetto/array/null */
type RawRoom = { name: string } | { name: string }[] | null | undefined;
function normRoom(raw: RawRoom): { name: string } | null {
  if (!raw) return null;
  return Array.isArray(raw) ? (raw[0] ?? null) : raw;
}

/** Presenti in struttura in una certa data: check_in <= d && check_out > d */
export async function getInHouse(date: Date): Promise<InHouseRow[]> {
  const iso = date.toISOString();
  const { data, error } = await supabaseAdmin
    .from('bookings')
    .select('id, room_id, pax, guest_firstname, guest_lastname, breakfast_done, rooms!bookings_room_id_fkey(name)')
    .lte('check_in', iso)
    .gt('check_out', iso)
    .order('room_id', { ascending: true });

  if (error) throw new Error(error.message);

  type Raw = {
    id: string;
    room_id: number | string;
    pax: number;
    guest_firstname: string;
    guest_lastname: string;
    breakfast_done: boolean | null;
    rooms?: RawRoom;
  };

  const rows = (data ?? []) as Raw[];
  return rows.map((b) => ({
    id: String(b.id),
    room_id: b.room_id,
    pax: b.pax,
    guest_firstname: b.guest_firstname,
    guest_lastname: b.guest_lastname,
    breakfast_done: b.breakfast_done ?? null,
    rooms: normRoom(b.rooms),
  }));
}

/** Partenze del giorno [date] */
export async function getDeparturesToday(date: Date): Promise<DepartureRow[]> {
  const from = date.toISOString();
  const to = addDays(date, 1).toISOString();

  const { data, error } = await supabaseAdmin
    .from('bookings')
    .select('id, room_id, guest_firstname, guest_lastname, payment_status, rooms!bookings_room_id_fkey(name)')
    .gte('check_out', from)
    .lt('check_out', to)
    .order('room_id', { ascending: true });

  if (error) throw new Error(error.message);

  type Raw = {
    id: string;
    room_id: number | string;
    guest_firstname: string;
    guest_lastname: string;
    payment_status: PaymentStatus | null;
    rooms?: RawRoom;
  };

  const rows = (data ?? []) as Raw[];
  return rows.map((b) => ({
    id: String(b.id),
    room_id: b.room_id,
    guest_firstname: b.guest_firstname,
    guest_lastname: b.guest_lastname,
    payment_status: (b.payment_status ?? 'NA') as PaymentStatus,
    rooms: normRoom(b.rooms),
  }));
}
