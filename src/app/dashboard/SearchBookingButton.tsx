// src/app/dashboard/SearchBookingButton.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type Row = {
  id: string | number;
  room_id?: string | number;
  guest_firstname: string;
  guest_lastname: string;
  check_in: string;
  check_out: string;
  pax: number;
  price: number | null;
  rooms?: { name: string } | null;
};

function fmt(d: string) {
  const s = String(d).slice(0, 10);
  const [y, m, dd] = s.split('-');
  return `${dd}/${m}/${y}`;
}

export default function SearchBookingButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [date, setDate] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const canSearch = useMemo(() => q.trim().length >= 2 || !!date, [q, date]);

  async function runSearch() {
    setLoading(true);
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (date) params.set('date', date);
    const res = await fetch(`/api/booking/search?${params.toString()}`);
    const data = await res.json();
    setRows(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function handleDelete(id: string | number) {
    if (!confirm('Confermi la cancellazione?')) return;
    if (!confirm('Ultima conferma: finirà nel Cestino per 30 giorni.')) return;

    const res = await fetch(`/api/booking/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert('Errore cancellazione: ' + (j.error ?? res.statusText));
      return;
    }
    setRows(prev => prev.filter(r => r.id !== id));
  }

  useEffect(() => {
    if (!open) return;
    setRows([]);
    setQ('');
    setDate('');
  }, [open]);

  return (
    <>
      <button className="ui-btn ui-btn-ghost" onClick={() => setOpen(true)}>
        Cerca prenotazione
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div className="ui-card w-full max-w-3xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Cerca prenotazione</h3>
              <button className="ui-btn ui-btn-ghost" onClick={() => setOpen(false)}>Chiudi</button>
            </div>

            <div className="flex flex-wrap items-end gap-3 mb-3">
              <div>
                <label className="ui-label">Cognome/Nome</label>
                <input className="ui-input" value={q} onChange={e => setQ(e.target.value)} placeholder="es. Rossi" />
              </div>
              <div>
                <label className="ui-label">Data (presenza)</label>
                <input type="date" className="ui-input" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <button className="ui-btn ui-btn-primary" onClick={runSearch} disabled={!canSearch || loading}>
                {loading ? 'Cerca…' : 'Cerca'}
              </button>
            </div>

            {rows.length === 0 ? (
              <div className="ui-hint">Nessun risultato.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500">
                      <th className="py-2 pr-3">Camera</th>
                      <th className="py-2 pr-3">Ospite</th>
                      <th className="py-2 pr-3">Soggiorno</th>
                      <th className="py-2 pr-3">Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(r => (
                      <tr key={String(r.id)} className="border-t">
                        <td className="py-2 pr-3">#{r.rooms?.name ?? r.room_id}</td>
                        <td className="py-2 pr-3">{r.guest_firstname} {r.guest_lastname}</td>
                        <td className="py-2 pr-3">{fmt(r.check_in)} → {fmt(r.check_out)} • {r.pax} pax</td>
                        <td className="py-2 pr-3">
                          <div className="flex gap-2">
                            <a className="ui-btn ui-btn-ghost" href={`/bookings?id=${r.id}`}>Modifica</a>
                            <button className="ui-btn ui-btn-danger" onClick={() => handleDelete(r.id)}>Cancella</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
