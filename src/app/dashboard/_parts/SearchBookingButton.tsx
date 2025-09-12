'use client';

import { useState } from 'react';

type Row = {
  id: string;
  room: string;
  guest: string;
  check_in: string;   // DD/MM/YYYY
  check_out: string;  // DD/MM/YYYY
  pax: number;
  price: string;
};

export default function SearchBookingButton() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [date, setDate] = useState(''); // YYYY-MM-DD
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    setRows([]);
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (date) params.set('date', date);
    const res = await fetch(`/api/booking/search?${params.toString()}`);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error ?? res.statusText);
    } else {
      const j = (await res.json()) as { results: Row[] };
      setRows(j.results);
    }
    setLoading(false);
  }

  return (
    <div className="relative">
      <button className="ui-btn ui-btn-ghost" onClick={() => setOpen(true)}>
        Cerca prenotazione
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* backdrop */}
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          {/* modal */}
          <div className="relative bg-white rounded-2xl shadow-xl w-[min(900px,92vw)] p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Cerca prenotazione</h3>
              <button className="ui-btn ui-btn-ghost" onClick={() => setOpen(false)}>Chiudi</button>
            </div>

            <form onSubmit={handleSearch} className="flex flex-wrap gap-3 items-end mb-4">
              <div>
                <label className="block text-sm text-slate-600">Cognome</label>
                <input
                  className="ui-input"
                  placeholder="Es. Rossi"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600">Data arrivo</label>
                <input
                  type="date"
                  className="ui-input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <button className="ui-btn ui-btn-primary" disabled={loading}>
                {loading ? 'Cerco...' : 'Cerca'}
              </button>
            </form>

            {err && <div className="ui-card text-sm text-rose-700 mb-3">{err}</div>}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b">
                    <th className="py-2 pr-3">Camera</th>
                    <th className="py-2 pr-3">Ospite</th>
                    <th className="py-2 pr-3">Arrivo</th>
                    <th className="py-2 pr-3">Partenza</th>
                    <th className="py-2 pr-3">Pax</th>
                    <th className="py-2 pr-3">Prezzo</th>
                    <th className="py-2 pr-3 text-right">Azione</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td className="py-3 text-slate-500" colSpan={7}>
                        {loading ? 'Ricerca in corso...' : 'Nessun risultato.'}
                      </td>
                    </tr>
                  ) : (
                    rows.map((r) => (
                      <tr key={r.id} className="border-t">
                        <td className="py-2 pr-3">#{r.room}</td>
                        <td className="py-2 pr-3">{r.guest}</td>
                        <td className="py-2 pr-3">{r.check_in}</td>
                        <td className="py-2 pr-3">{r.check_out}</td>
                        <td className="py-2 pr-3">{r.pax}</td>
                        <td className="py-2 pr-3">€ {r.price}</td>
                        <td className="py-2 pr-3 text-right">
                          <a className="ui-btn ui-btn-ghost" href={`/bookings?id=${r.id}`}>Modifica</a>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
