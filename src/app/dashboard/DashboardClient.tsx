// src/app/dashboard/DashboardClient.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import SearchBookingButton from "./_parts/SearchBookingButton";

type PaymentStatus = 'DUE' | 'PAID' | 'NA';

type BookingRow = {
  id: string;
  room_id: string | number;
  check_in: string;
  check_out: string;
  pax: number;
  price: number | null;
  guest_firstname: string;
  guest_lastname: string;
  breakfast_done?: boolean | null;
  payment_status?: PaymentStatus | null;
  rooms: { name: string } | null;
};

type DbBookingRow = Omit<BookingRow, 'rooms'> & {
  rooms?: { name: string } | { name: string }[] | null;
};

function normalizeBookingRow(r: DbBookingRow): BookingRow {
  const roomObj = Array.isArray(r.rooms) ? (r.rooms[0] ?? null) : (r.rooms ?? null);
  return {
    id: String(r.id),
    room_id: r.room_id,
    check_in: r.check_in,
    check_out: r.check_out,
    pax: r.pax,
    price: r.price,
    guest_firstname: r.guest_firstname,
    guest_lastname: r.guest_lastname,
    breakfast_done: r.breakfast_done ?? null,
    payment_status: r.payment_status ?? null,
    rooms: roomObj ? { name: roomObj.name } : null,
  };
}

function fmtDate(input: string): string {
  const ymd = String(input).slice(0, 10);
  const [y, m, d] = ymd.split('-');
  return `${d}/${m}/${y}`;
}
function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
function addDaysISO(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export default function DashboardClient() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  const [roomsCount, setRoomsCount] = useState<number>(0);
  const [activeTodayCount, setActiveTodayCount] = useState<number>(0);

  const [arrivals, setArrivals] = useState<BookingRow[]>([]);
  const [departures, setDepartures] = useState<BookingRow[]>([]);
  const [recent, setRecent] = useState<BookingRow[]>([]);
  const [inHouseToday, setInHouseToday] = useState<BookingRow[]>([]);
  const [inHouseTomorrow, setInHouseTomorrow] = useState<BookingRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Auth
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace('/login');
      } else {
        setEmail(data.user.email ?? null);
      }
    });
  }, [router]);

  // Load dashboard
  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      const tdy = todayISO();

      // Camere totali
      const roomsQ = await supabase.from('rooms').select('id', { count: 'exact', head: true });
      if (roomsQ.error) setErr(prev => prev ? prev + ` | rooms: ${roomsQ.error!.message}` : `rooms: ${roomsQ.error!.message}`);
      setRoomsCount(roomsQ.count ?? 0);

      // Prenotazioni attive oggi
      const activeQ = await supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null)
        .lte('check_in', tdy)
        .gt('check_out', tdy);
      if (activeQ.error) setErr(prev => prev ? prev + ` | active: ${activeQ.error!.message}` : `active: ${activeQ.error!.message}`);
      setActiveTodayCount(activeQ.count ?? 0);

      // Presenti oggi
      const inhouseTodayQ = await supabase
        .from('bookings')
        .select('id, room_id, check_in, check_out, pax, price, guest_firstname, guest_lastname, breakfast_done, rooms(name)')
        .is('deleted_at', null)
        .lte('check_in', tdy)
        .gt('check_out', tdy)
        .order('room_id', { ascending: true });
      if (inhouseTodayQ.error) setErr(prev => prev ? prev + ` | inhouse(today): ${inhouseTodayQ.error!.message}` : `inhouse(today): ${inhouseTodayQ.error!.message}`);
      setInHouseToday(((inhouseTodayQ.data as DbBookingRow[]) || []).map(normalizeBookingRow));

      // Presenti domani
      const tmr = addDaysISO(1);
      const inhouseTomorrowQ = await supabase
        .from('bookings')
        .select('id, room_id, check_in, check_out, pax, price, guest_firstname, guest_lastname, rooms(name)')
        .is('deleted_at', null)
        .lte('check_in', tmr)
        .gt('check_out', tmr)
        .order('room_id', { ascending: true });
      if (inhouseTomorrowQ.error) setErr(prev => prev ? prev + ` | inhouse(tmr): ${inhouseTomorrowQ.error!.message}` : `inhouse(tmr): ${inhouseTomorrowQ.error!.message}`);
      setInHouseTomorrow(((inhouseTomorrowQ.data as DbBookingRow[]) || []).map(normalizeBookingRow));

      // Arrivi oggi
      const arrivalsQ = await supabase
        .from('bookings')
        .select('id, room_id, check_in, check_out, pax, price, guest_firstname, guest_lastname, rooms(name)')
        .is('deleted_at', null)
        .eq('check_in', tdy)
        .order('check_in', { ascending: true })
        .limit(10);
      if (arrivalsQ.error) setErr(prev => prev ? prev + ` | arrivals: ${arrivalsQ.error!.message}` : `arrivals: ${arrivalsQ.error!.message}`);
      setArrivals(((arrivalsQ.data as DbBookingRow[]) || []).map(normalizeBookingRow));

      // Partenze oggi
      const departuresQ = await supabase
        .from('bookings')
        .select('id, room_id, check_in, check_out, pax, price, guest_firstname, guest_lastname, payment_status, rooms(name)')
        .is('deleted_at', null)
        .eq('check_out', tdy)
        .order('check_out', { ascending: true })
        .limit(10);
      if (departuresQ.error) setErr(prev => prev ? prev + ` | departures: ${departuresQ.error!.message}` : `departures: ${departuresQ.error!.message}`);
      setDepartures(((departuresQ.data as DbBookingRow[]) || []).map(normalizeBookingRow));

      // Ultime prenotazioni
      const recentQ = await supabase
        .from('bookings')
        .select('id, room_id, check_in, check_out, pax, price, guest_firstname, guest_lastname, rooms(name)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(8);
      if (recentQ.error) setErr(prev => prev ? prev + ` | recent: ${recentQ.error!.message}` : `recent: ${recentQ.error!.message}`);
      setRecent(((recentQ.data as DbBookingRow[]) || []).map(normalizeBookingRow));

      setLoading(false);
    })();
  }, []);

  // Actions
  async function toggleBreakfast(bookingId: string, v: boolean) {
    setInHouseToday(prev => prev.map(b => b.id === bookingId ? { ...b, breakfast_done: v } : b));
    await fetch(`/api/booking/${bookingId}/flags`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ breakfast_done: v }),
    });
  }

  async function togglePaid(bookingId: string, paid: boolean) {
    setDepartures(prev => prev.map(b => b.id === bookingId ? { ...b, payment_status: paid ? 'PAID' : 'DUE' } : b));
    await fetch(`/api/booking/${bookingId}/flags`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payment_status: paid ? 'PAID' : 'DUE' }),
    });
  }

  async function handleDelete(bookingId: string) {
    if (!confirm("Confermi la cancellazione della prenotazione?")) return;
    if (!confirm("Ultima conferma: la prenotazione andrà nel Cestino per 30 giorni.")) return;

    const res = await fetch(`/api/booking/${bookingId}`, { method: "DELETE" });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert("Errore cancellazione: " + (j.error ?? res.statusText));
      return;
    }
    setArrivals(prev => prev.filter(b => b.id !== bookingId));
    setInHouseToday(prev => prev.filter(b => b.id !== bookingId));
    setInHouseTomorrow(prev => prev.filter(b => b.id !== bookingId));
    setDepartures(prev => prev.filter(b => b.id !== bookingId));
    setRecent(prev => prev.filter(b => b.id !== bookingId));
  }

  const logout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const availableRooms = Math.max(0, roomsCount - activeTodayCount);

  return (
    <main className="ui-container space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Pannello</h1>
        <div className="flex items-center gap-3 text-sm">
          {email && <span className="text-slate-600">{email}</span>}
          <button onClick={logout} className="ui-btn ui-btn-ghost">Esci</button>
        </div>
      </div>

      {/* Azioni rapide */}
      <div className="ui-card flex flex-wrap gap-3">
        <a href="/bookings" className="ui-btn ui-btn-primary">+ Nuova prenotazione</a>
        <a href="/rooms" className="ui-btn ui-btn-ghost">Gestione camere</a>
        <a href="/calendar" className="ui-btn ui-btn-ghost">Calendario (anno)</a>

        <div className="relative">
          <details>
            <summary className="ui-btn ui-btn-ghost cursor-pointer">Export</summary>
            <div className="absolute z-10 mt-2 w-44 rounded border bg-white shadow">
              <a className="block px-3 py-2 hover:bg-gray-50" href="/api/booking/export?scope=today">Oggi</a>
              <a className="block px-3 py-2 hover:bg-gray-50" href="/api/booking/export?scope=past">Passate</a>
              <a className="block px-3 py-2 hover:bg-gray-50" href="/api/booking/export?scope=future">Future</a>
            </div>
          </details>
        </div>

        <a href="/trash" className="ui-btn ui-btn-ghost">Cestino</a>
      </div>

      {err && <div className="ui-card text-sm text-rose-700">{err}</div>}

      {loading ? (
        <div className="ui-card">Caricamento…</div>
      ) : (
        <>
          {/* Metriche */}
          <section className="ui-grid-3">
            <div className="ui-card">
              <div className="text-sm text-slate-500">Camere disponibili</div>
              <div className="text-3xl font-semibold mt-1">{availableRooms}</div>
              <div className="ui-hint mt-2">Totali: {roomsCount} • Attive oggi: {activeTodayCount}</div>
            </div>
            <div className="ui-card">
              <div className="text-sm text-slate-500">Prenotazioni attive oggi</div>
              <div className="text-3xl font-semibold mt-1">{activeTodayCount}</div>
              <div className="ui-hint mt-2">check-in ≤ oggi &lt; check-out</div>
            </div>
            <div className="ui-card">
              <div className="text-sm text-slate-500 mb-2">Ricerca prenotazione</div>
              <SearchBookingButton />
            </div>
          </section>

<div className="ui-card">
  <div className="ui-section-title mb-3">Presenti oggi</div>
  {inHouseToday.length === 0 ? (
    <div className="ui-hint">Nessuna camera presente oggi.</div>
  ) : (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-500">
            <th className="py-2 pr-3">Camera</th>
            <th className="py-2 pr-3">Ospite</th>
            <th className="py-2 pr-3">Pax</th>
            <th className="py-2 pr-3">Soggiorno</th>
            <th className="py-2 pr-3 text-center">Colazione</th>
          </tr>
        </thead>
        <tbody>
          {inHouseToday.map((b) => (
            <tr key={b.id} className="border-t">
              <td className="py-2 pr-3">#{b.rooms?.name ?? '—'}</td>
              <td className="py-2 pr-3">
                {b.guest_firstname} {b.guest_lastname}
              </td>
              <td className="py-2 pr-3">{b.pax}</td>
              <td className="py-2 pr-3">
                {fmtDate(b.check_in)} → {fmtDate(b.check_out)}
              </td>
              <td className="py-2 pr-3 text-center">
                <input
                  type="checkbox"
                  checked={Boolean(b.breakfast_done)}
                  onChange={(e) => toggleBreakfast(b.id, e.target.checked)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )}
</div>

            <div className="ui-card">
              <div className="ui-section-title mb-3">Presenti domani</div>
              {inHouseTomorrow.length === 0 ? (
                <div className="ui-hint">Nessuna camera presente domani.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-500">
                        <th className="py-2 pr-3">Camera</th>
                        <th className="py-2 pr-3">Ospite</th>
                        <th className="py-2 pr-3">Pax</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inHouseTomorrow.map(b => (
                        <tr key={b.id} className="border-t">
                          <td className="py-2 pr-3">#{b.rooms?.name ?? '—'}</td>
                          <td className="py-2 pr-3">{b.guest_firstname} {b.guest_lastname}</td>
                          <td className="py-2 pr-3">{b.pax}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
         

          {/* Arrivi / Partenze */}
          <section className="ui-grid-2">
            <div className="ui-card">
              <div className="ui-section-title mb-3">Arrivi oggi</div>
              {arrivals.length === 0 ? (
                <div className="ui-hint">Nessun arrivo.</div>
              ) : (
                <ul className="divide-y">
                  {arrivals.map(b => (
                    <li key={b.id} className="py-2 flex items-center justify-between">
                      <div>
                        <div className="font-medium">
                          Camera {b.rooms?.name ?? '—'} — {b.guest_firstname} {b.guest_lastname}
                        </div>
                        <div className="text-sm text-slate-500">
                          Soggiorno {fmtDate(b.check_in)} → {fmtDate(b.check_out)} • {b.pax} pax
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-sm">€ {Number(b.price ?? 0).toFixed(2)}</div>
                        <button
                          type="button"
                          className="ui-btn ui-btn-danger"
                          onClick={() => handleDelete(b.id)}
                        >
                          Cancella
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="ui-card">
              <div className="ui-section-title mb-3">Partenze oggi</div>
              {departures.length === 0 ? (
                <div className="ui-hint">Nessuna partenza.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-500">
                        <th className="py-2 pr-3">Camera</th>
                        <th className="py-2 pr-3">Ospite</th>
                        <th className="py-2 pr-3">Soggiorno</th>
                        <th className="py-2 pr-3 text-center">Pagamento</th>
                      </tr>
                    </thead>
                    <tbody>
                      {departures.map(b => {
                        const paid = b.payment_status === 'PAID';
                        const badgeCls = paid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800';
                        return (
                          <tr key={b.id} className="border-t">
                            <td className="py-2 pr-3">#{b.rooms?.name ?? '—'}</td>
                            <td className="py-2 pr-3">{b.guest_firstname} {b.guest_lastname}</td>
                            <td className="py-2 pr-3">{fmtDate(b.check_in)} → {fmtDate(b.check_out)} • {b.pax} pax</td>
                            <td className="py-2 pr-3 text-center">
                              <div className="flex items-center justify-center gap-3">
                                <span className={`px-2 py-1 rounded ${badgeCls}`}>
                                  {paid ? 'Pagato' : 'Da pagare'}
                                </span>
                                <label className="inline-flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={paid}
                                    onChange={(e) => togglePaid(b.id, e.target.checked)}
                                  />
                                  <span>€ {Number(b.price ?? 0).toFixed(2)}</span>
                                </label>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          {/* Ultime prenotazioni */}
          <section className="ui-card">
            <div className="flex items-center justify-between mb-2">
              <div className="ui-section-title">Ultime prenotazioni</div>
              <a href="/reservations" className="ui-btn ui-btn-ghost opacity-80 pointer-events-none">Vedi tutte (presto)</a>
            </div>
            {recent.length === 0 ? (
              <div className="ui-hint">Nessuna prenotazione registrata.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500">
                      <th className="py-2 pr-3">Camera</th>
                      <th className="py-2 pr-3">Ospite</th>
                      <th className="py-2 pr-3">Soggiorno</th>
                      <th className="py-2 pr-3">Pax</th>
                      <th className="py-2 pr-3">Prezzo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map(b => (
                      <tr key={b.id} className="border-t">
                        <td className="py-2 pr-3">#{b.rooms?.name ?? '—'}</td>
                        <td className="py-2 pr-3">{b.guest_firstname} {b.guest_lastname}</td>
                        <td className="py-2 pr-3">{fmtDate(b.check_in)} → {fmtDate(b.check_out)}</td>
                        <td className="py-2 pr-3">{b.pax}</td>
                        <td className="py-2 pr-3">€ {Number(b.price ?? 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
