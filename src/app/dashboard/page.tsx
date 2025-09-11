'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';


// eslint-disable-next-line @typescript-eslint/no-unused-vars
type RateType = {
  id: number;
  name: string;
};

type BookingRow = {
  id: string;
  room_id: string;
  check_in: string;   // YYYY-MM-DD
  check_out: string;  // YYYY-MM-DD
  pax: number;
  price: number;
  guest_firstname: string;
  guest_lastname: string;
  rooms: { name: string } | null; // oggetto normalizzato
};

type DbBookingRow = {
  id: string;
  room_id: string;
  check_in: string;
  check_out: string;
  pax: number;
  price: number;
  guest_firstname: string;
  guest_lastname: string;
  // il join può arrivare come oggetto, array o null
  rooms?: { name: string } | { name: string }[] | null;
};

function normalizeBookingRow(r: DbBookingRow): BookingRow {
  const roomObj = Array.isArray(r.rooms)
    ? (r.rooms[0] ?? null)
    : (r.rooms ?? null);

  return {
    id: r.id,
    room_id: r.room_id,
    check_in: r.check_in,
    check_out: r.check_out,
    pax: r.pax,
    price: r.price,
    guest_firstname: r.guest_firstname,
    guest_lastname: r.guest_lastname,
    rooms: roomObj ? { name: roomObj.name } : null,
  };
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

export default function Dashboard() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  const [roomsCount, setRoomsCount] = useState<number>(0);
  const [activeTodayCount, setActiveTodayCount] = useState<number>(0);

  const [arrivals, setArrivals] = useState<BookingRow[]>([]);
  const [departures, setDepartures] = useState<BookingRow[]>([]);
  const [recent, setRecent] = useState<BookingRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Auth guard
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace('/login');
      } else {
        setEmail(data.user.email ?? null);
      }
    });
  }, [router]);

  // Caricamento dati cruscotto
  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      const tdy = todayISO();

      // 1) Camere totali
      const roomsQ = await supabase.from('rooms').select('id', { count: 'exact', head: true });
      if (roomsQ.error) setErr(prev => prev ? prev + ` | rooms: ${roomsQ.error!.message}` : `rooms: ${roomsQ.error!.message}`);
      setRoomsCount(roomsQ.count ?? 0);

      // 2) Prenotazioni attive oggi (check_in <= today < check_out)
      const activeQ = await supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .lte('check_in', tdy)
        .gt('check_out', tdy);
      if (activeQ.error) setErr(prev => prev ? prev + ` | active: ${activeQ.error!.message}` : `active: ${activeQ.error!.message}`);
      setActiveTodayCount(activeQ.count ?? 0);

      // 3) Arrivi oggi
      const arrivalsQ = await supabase
        .from('bookings')
        .select('id, room_id, check_in, check_out, pax, price, guest_firstname, guest_lastname, rooms(name)')
        .eq('check_in', tdy)
        .order('check_in', { ascending: true })
        .limit(10);
      if (arrivalsQ.error) setErr(prev => prev ? prev + ` | arrivals: ${arrivalsQ.error!.message}` : `arrivals: ${arrivalsQ.error!.message}`);
      setArrivals(((arrivalsQ.data as DbBookingRow[]) || []).map(normalizeBookingRow));

      // 4) Partenze oggi
      const departuresQ = await supabase
        .from('bookings')
        .select('id, room_id, check_in, check_out, pax, price, guest_firstname, guest_lastname, rooms(name)')
        .eq('check_out', tdy)
        .order('check_out', { ascending: true })
        .limit(10);
      if (departuresQ.error) setErr(prev => prev ? prev + ` | departures: ${departuresQ.error!.message}` : `departures: ${departuresQ.error!.message}`);
      setDepartures(((departuresQ.data as DbBookingRow[]) || []).map(normalizeBookingRow));

      // 5) Ultime prenotazioni inserite
      const recentQ = await supabase
        .from('bookings')
        .select('id, room_id, check_in, check_out, pax, price, guest_firstname, guest_lastname, rooms(name)')
        .order('created_at', { ascending: false })
        .limit(8);
      if (recentQ.error) setErr(prev => prev ? prev + ` | recent: ${recentQ.error!.message}` : `recent: ${recentQ.error!.message}`);
      setRecent(((recentQ.data as DbBookingRow[]) || []).map(normalizeBookingRow));

      setLoading(false);
    })();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

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
        <a href="#" className="ui-btn ui-btn-ghost opacity-60 pointer-events-none">Clienti (presto)</a>
        <a href="#" className="ui-btn ui-btn-ghost opacity-60 pointer-events-none">Listino (presto)</a>
        <a href="#" className="ui-btn ui-btn-ghost opacity-60 pointer-events-none">Convenzioni (presto)</a>
      </div>

      {err && <div className="ui-card text-sm text-rose-700">{err}</div>}

      {loading ? (
        <div className="ui-card">Caricamento…</div>
      ) : (
        <>
          {/* Metriche */}
          <section className="ui-grid-3">
            <div className="ui-card">
              <div className="text-sm text-slate-500">Camere totali</div>
              <div className="text-3xl font-semibold mt-1">{roomsCount}</div>
            </div>
            <div className="ui-card">
              <div className="text-sm text-slate-500">Prenotazioni attive oggi</div>
              <div className="text-3xl font-semibold mt-1">{activeTodayCount}</div>
              <div className="ui-hint mt-2">check-in ≤ oggi &lt; check-out</div>
            </div>
            <div className="ui-card">
              <div className="text-sm text-slate-500">Data</div>
              <div className="text-3xl font-semibold mt-1">{todayISO()}</div>
            </div>
          </section>

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
                          Soggiorno {b.check_in} → {b.check_out} • {b.pax} pax
                        </div>
                      </div>
                      <div className="text-sm">€ {Number(b.price).toFixed(2)}</div>
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
                <ul className="divide-y">
                  {departures.map(b => (
                    <li key={b.id} className="py-2 flex items-center justify-between">
                      <div>
                        <div className="font-medium">
                          Camera {b.rooms?.name ?? '—'} — {b.guest_firstname} {b.guest_lastname}
                        </div>
                        <div className="text-sm text-slate-500">
                          Soggiorno {b.check_in} → {b.check_out} • {b.pax} pax
                        </div>
                      </div>
                      <div className="text-sm">€ {Number(b.price).toFixed(2)}</div>
                    </li>
                  ))}
                </ul>
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
                        <td className="py-2 pr-3">{b.check_in} → {b.check_out}</td>
                        <td className="py-2 pr-3">{b.pax}</td>
                        <td className="py-2 pr-3">€ {Number(b.price).toFixed(2)}</td>
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
