'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Room = { id: string; name: string; allowed_types: string[] };

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      alert('Errore nel caricamento: ' + error.message);
    } else if (data) {
      setRooms(data as Room[]);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  return (
    <main className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Camere</h1>
        <button onClick={load} className="px-4 py-2 rounded-xl border">Aggiorna</button>
      </div>

      {loading ? (
        <p>Caricamento…</p>
      ) : rooms.length === 0 ? (
        <p>Nessuna camera trovata.</p>
      ) : (
        <ul className="space-y-2">
          {rooms.map(r => (
            <li key={r.id} className="p-4 rounded-2xl border">
              <div className="text-lg">
                <b>Camera {r.name}</b> — tipi: {r.allowed_types.join(', ')}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
