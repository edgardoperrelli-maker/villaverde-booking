// src/app/trash/page.tsx
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { supabaseAdmin } from '@/supabaseAdmin';
import type { Database } from '@/types/supabase';

// Prendiamo la riga base della tabella bookings dai tipi generati
type BookingRowBase = Database['public']['Tables']['bookings']['Row'];

// Rappresenta esattamente ciò che selezioniamo nella query
type TrashRow = Pick<
  BookingRowBase,
  | 'id'
  | 'room_id'
  | 'check_in'
  | 'check_out'
  | 'pax'
  | 'price'
  | 'guest_firstname'
  | 'guest_lastname'
  | 'deleted_at'
> & {
  rooms: { name: string } | null;
};

// Helper: data ITA (accetta anche null per sicurezza)
function fmt(d?: string | null) {
  if (!d) return '—';
  const s = String(d).slice(0, 10); // YYYY-MM-DD
  const [y, m, dd] = s.split('-');
  return `${dd}/${m}/${y}`;
}

// Giorni rimanenti ai 30 dalla cancellazione (accetta anche null)
function daysLeft(iso?: string | null) {
  if (!iso) return 0;
  const del = new Date(iso).getTime();
  const end = del + 30 * 24 * 60 * 60 * 1000;
  const left = Math.max(0, Math.ceil((end - Date.now()) / (24 * 60 * 60 * 1000)));
  return left;
}

export default async function TrashPage() {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabaseAdmin
    .from('bookings')
    .select(
      'id, room_id, check_in, check_out, pax, price, guest_firstname, guest_lastname, rooms(name), deleted_at'
    )
    .not('deleted_at', 'is', null)
    .gte('deleted_at', cutoff)
    .order('deleted_at', { ascending: false });

  if (error) {
    return (
      <main className="ui-container">
        <div className="ui-card text-rose-700">Errore: {error.message}</div>
      </main>
    );
  }

  // Tipizza i risultati evitando any
  const rows: TrashRow[] = (data ?? []) as TrashRow[];

  return (
    <main className="ui-container space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Cestino (ultimi 30 giorni)</h1>
        <a href="/dashboard" className="ui-btn ui-btn-ghost">
          ← Torna alla dashboard
        </a>
      </div>

      <div className="ui-card">
        {rows.length === 0 ? (
          <div className="ui-hint">Nessuna prenotazione cancellata negli ultimi 30 giorni.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-2 pr-3">Cancellata il</th>
                  <th className="py-2 pr-3">Camera</th>
                  <th className="py-2 pr-3">Ospite</th>
                  <th className="py-2 pr-3">Soggiorno</th>
                  <th className="py-2 pr-3">Giorni rimasti</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="py-2 pr-3">{fmt(r.deleted_at)}</td>
                    <td className="py-2 pr-3">#{r.rooms?.name ?? r.room_id}</td>
                    <td className="py-2 pr-3">
                      {r.guest_firstname} {r.guest_lastname}
                    </td>
                    <td className="py-2 pr-3">
                      {fmt(r.check_in)} → {fmt(r.check_out)} • {r.pax} pax
                    </td>
                    <td className="py-2 pr-3">{daysLeft(r.deleted_at)} gg</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="ui-card">
        <div className="flex items-center justify-between">
          <div className="ui-hint">Pulizia automatica giornaliera. Puoi forzare ora:</div>
          <form action="/api/maintenance/purge-deleted" method="post">
            <button className="ui-btn ui-btn-danger">Svuota elementi scaduti</button>
          </form>
        </div>
      </div>
    </main>
  );
}
