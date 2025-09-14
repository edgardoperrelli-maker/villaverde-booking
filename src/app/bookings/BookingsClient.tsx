'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

// ----------------------------- Tipi ------------------------------------

type RateType = 'Singola' | 'Doppia' | 'Tripla' | 'Quadrupla';

type Room = {
  id: string;
  name: string;
  allowed_types: RateType[];
};

type Rate = { type: RateType; price: number };

type Customer = {
  id: string;
  kind: 'company' | 'individual';
  display_name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
};

type Convention = {
  id: string;
  name: string;
  rate_type: RateType;
  price: number;
  active: boolean;
};

type Item = {
  roomId: string;
  pax: number;
  rateTypeRow: RateType;
  conventionId: string | null;
  price: number;
  useMainGuest: boolean;
  guestFirst?: string;
  guestLast?: string;
};

// ----------------------------- Utils -----------------------------------

function normalizeTypes(v: unknown): string[] {
  if (Array.isArray(v)) return v as string[];
  if (v == null) return [];
  const s = String(v).trim();
  try {
    const parsed = JSON.parse(s);
    if (Array.isArray(parsed)) return parsed as string[];
  } catch {}
  const cleaned = s.replace(/[{}"]/g, '');
  return cleaned ? cleaned.split(',').map(x => x.trim()).filter(Boolean) : [];
}

const RATE_LABEL: Record<RateType, string> = {
  Singola: 'Singola / DUS',
  Doppia: 'Doppia / Matrimoniale',
  Tripla: 'Tripla',
  Quadrupla: 'Quadrupla',
};

function paxToRateType(p: number): RateType {
  if (p <= 1) return 'Singola';
  if (p === 2) return 'Doppia';
  if (p === 3) return 'Tripla';
  return 'Quadrupla';
}

// ----------------------------- Pagina ----------------------------------

export default function BookingsPage() {
  const router = useRouter();
  const search = useSearchParams();
  const editId = search.get('id'); // se presente, siamo in MODIFICA
  const isEdit = Boolean(editId);

  const [rooms, setRooms] = useState<Room[]>([]);
  const [rates, setRates] = useState<Rate[]>([]);
  const [conventions, setConventions] = useState<Convention[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [kind, setKind] = useState<'company' | 'individual'>('individual');

  const [useExistingCompany, setUseExistingCompany] = useState(true);
  const [companyId, setCompanyId] = useState('');
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyPhone, setNewCompanyPhone] = useState('');
  const [newCompanyEmail, setNewCompanyEmail] = useState('');
  const [newCompanyNotes, setNewCompanyNotes] = useState('');

  const [useExistingIndividual, setUseExistingIndividual] = useState(true);
  const [individualId, setIndividualId] = useState('');
  const [newIndividualName, setNewIndividualName] = useState('');
  const [newIndividualPhone, setNewIndividualPhone] = useState('');
  const [newIndividualEmail, setNewIndividualEmail] = useState('');
  const [newIndividualNotes, setNewIndividualNotes] = useState('');

  const [guestFirst, setGuestFirst] = useState('');
  const [guestLast, setGuestLast] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');

  // YYYY-MM-DD per <input type="date">
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [defaultPax, setDefaultPax] = useState(1);

  const [items, setItems] = useState<Item[]>([
    { roomId: '', pax: 1, rateTypeRow: 'Singola', conventionId: null, price: 0, useMainGuest: true },
  ]);

  const [showAllRooms, setShowAllRooms] = useState(false);

  // ------------------ Caricamento dati di base ------------------
  useEffect(() => {
    (async () => {
      setLoading(true);
      setLoadError(null);

      type RoomDbRow = { id: string; name: string; allowed_types: unknown };

      const [r1, r2, r3, r4] = await Promise.all([
        supabase.from('rooms').select('*').order('name'),
        supabase.from('rate_cards').select('*'),
        supabase.from('customers').select('*').order('display_name'),
        supabase.from('conventions').select('*').eq('active', true).order('name'),
      ]);

      if (r1.error) setLoadError(`Errore rooms: ${r1.error.message}`);
      if (r2.error) setLoadError(prev => (prev ? `${prev} | tariffe: ${r2.error!.message}` : `Errore tariffe: ${r2.error!.message}`));
      if (r3.error) setLoadError(prev => (prev ? `${prev} | clienti: ${r3.error!.message}` : `Errore clienti: ${r3.error!.message}`));
      if (r4.error) setLoadError(prev => (prev ? `${prev} | convenzioni: ${r4.error!.message}` : `Errore convenzioni: ${r4.error!.message}`));

      if (!r1.error && r1.data) {
        const normalized: Room[] = (r1.data as RoomDbRow[]).map(r => ({
          id: r.id,
          name: r.name,
          allowed_types: normalizeTypes(r.allowed_types) as RateType[],
        }));
        setRooms(normalized);
      }
      if (!r2.error && r2.data) setRates(r2.data as Rate[]);
      if (!r3.error && r3.data) setCustomers(r3.data as Customer[]);
      if (!r4.error && r4.data) setConventions(r4.data as Convention[]);

      setLoading(false);
    })();
  }, []);

  // ------------------ Helpers ------------------
  function priceFromListino(rt: RateType): number {
    const r = rates.find(x => x.type === rt);
    return r ? Number(r.price) : 0;
  }

  function findConvention(id: string | null): Convention | undefined {
    if (!id) return undefined;
    return conventions.find(c => c.id === id);
  }

  function updateItem(idx: number, patch: Partial<Item>) {
    setItems(prev =>
      prev.map((it, i) => {
        if (i !== idx) return it;
        const next: Item = { ...it, ...patch };

        // cambio pax → ricalcolo tipo e prezzo
        if (patch.pax !== undefined) {
          const p = Math.min(4, Math.max(1, patch.pax));
          next.pax = p;
          const newRt = paxToRateType(p);
          next.rateTypeRow = newRt;

          const conv = findConvention(next.conventionId);
          if (conv && conv.rate_type !== newRt) {
            next.conventionId = null;
            next.price = priceFromListino(newRt);
          } else {
            next.price = conv ? Number(conv.price) : priceFromListino(newRt);
          }
        }

        // cambio convenzione → prezzo
        if (patch.conventionId !== undefined) {
          const conv = findConvention(patch.conventionId ?? null);
          if (conv) {
            if (conv.rate_type !== next.rateTypeRow) {
              next.conventionId = null;
              next.price = priceFromListino(next.rateTypeRow);
            } else {
              next.conventionId = conv.id;
              next.price = Number(conv.price);
            }
          } else {
            next.conventionId = null;
            next.price = priceFromListino(next.rateTypeRow);
          }
        }

        return next;
      })
    );
  }

  function addItem() {
    const p = Math.min(Math.max(defaultPax, 1), 4);
    const rt = paxToRateType(p);
    setItems(prev => [
      ...prev,
      {
        roomId: '',
        pax: p,
        rateTypeRow: rt,
        conventionId: null,
        price: priceFromListino(rt),
        useMainGuest: true,
      },
    ]);
  }

  function removeItem(idx: number) {
    setItems(prev => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));
  }

  function roomOptionsForRow(rt: RateType): Room[] {
    const compat = rooms.filter(r => r.allowed_types.includes(rt));
    if (showAllRooms || compat.length === 0) return rooms;
    return compat;
  }

  const companies = customers.filter(c => c.kind === 'company');
  const individuals = customers.filter(c => c.kind === 'individual');

  // ------------------ Modalità MODIFICA: precompila se ?id=... ------------------
  useEffect(() => {
    if (!editId) return;
    (async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('id, room_id, check_in, check_out, pax, price, guest_firstname, guest_lastname')
        .eq('id', editId)
        .single();

      if (error || !data) return;

      // Precompila campi principali
      setGuestFirst(data.guest_firstname ?? '');
      setGuestLast(data.guest_lastname ?? '');
      setCheckIn(String(data.check_in).slice(0, 10)); // YYYY-MM-DD
      setCheckOut(String(data.check_out).slice(0, 10));
      setDefaultPax(Number(data.pax ?? 1));

      const rt = paxToRateType(Number(data.pax ?? 1));
      setItems([
        {
          roomId: String((data as { room_id: string | number }).room_id ?? ''),
          pax: Number(data.pax ?? 1),
          rateTypeRow: rt,
          conventionId: null,
          price: typeof data.price === 'number' ? data.price : 0,
          useMainGuest: true,
        },
      ]);
    })();
  }, [editId]);

  // ------------------ Salvataggio ------------------
  async function resolveCustomerId(): Promise<string | null> {
    if (kind === 'company') {
      if (useExistingCompany) {
        if (!companyId) {
          alert('Seleziona una società esistente oppure crea una nuova.');
          return null;
        }
        return companyId;
      } else {
        if (!newCompanyName.trim()) {
          alert('Inserisci la ragione sociale.');
          return null;
        }
        const { data, error } = await supabase
          .from('customers')
          .insert({
            kind: 'company',
            display_name: newCompanyName.trim(),
            phone: newCompanyPhone || null,
            email: newCompanyEmail || null,
            notes: newCompanyNotes || null,
          })
          .select('id')
          .single();
        if (error) {
          alert('Errore creazione anagrafica (società): ' + error.message);
          return null;
        }
        return data!.id;
      }
    } else {
      if (useExistingIndividual) {
        if (!individualId) {
          alert('Seleziona un privato esistente oppure crea una nuova anagrafica.');
          return null;
        }
        return individualId;
      } else {
        if (!newIndividualName.trim()) {
          alert('Inserisci Nome e Cognome del cliente.');
          return null;
        }
        const { data, error } = await supabase
          .from('customers')
          .insert({
            kind: 'individual',
            display_name: newIndividualName.trim(),
            phone: newIndividualPhone || null,
            email: newIndividualEmail || null,
            notes: newIndividualNotes || null,
          })
          .select('id')
          .single();
        if (error) {
          alert('Errore creazione anagrafica (privato): ' + error.message);
          return null;
        }
        return data!.id;
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (deleting) return; // evita conflitti
    setSaving(true);
    try {
      if (!guestFirst.trim() || !guestLast.trim()) {
        alert('Inserisci nome e cognome dell’ospite principale.');
        return;
      }
      if (!guestPhone.trim() && !guestEmail.trim()) {
        alert('Telefono o email dell’ospite principale obbligatorio.');
        return;
      }
      if (!checkIn || !checkOut) {
        alert('Inserisci check-in e check-out.');
        return;
      }
      if (items.some(it => !it.roomId || it.pax < 1 || it.pax > 4)) {
        alert('Seleziona camera e pax (1–4) su ogni riga.');
        return;
      }

      // --- MODIFICA: aggiorna una singola prenotazione (quella indicata da ?id) ---
      if (isEdit && editId) {
        const row = items[0];
        if (!row) {
          alert('Dati riga non validi.');
          return;
        }

        const fd = new FormData();
        fd.set('guest_firstname', guestFirst.trim());
        fd.set('guest_lastname', guestLast.trim());
        fd.set('check_in', checkIn);
        fd.set('check_out', checkOut);
        fd.set('pax', String(row.pax));
        fd.set('price', String(row.price));

        const res = await fetch(`/api/booking/${editId}`, { method: 'PATCH', body: fd });
        if (!res.ok) {
          const j: { error?: string } | null = await res.json().catch(() => null);
          alert(`Errore salvataggio: ${j?.error ?? res.statusText}`);
          return;
        }
        alert('Prenotazione aggiornata.');
        router.push('/dashboard');
        return;
      }

      // --- CREAZIONE: inserisce N righe (una per camera) ---
      const customer_id = await resolveCustomerId();
      if (!customer_id) return;

      // group id
      let groupId: string | undefined;
      try {
        const { data, error } = await supabase.rpc('uuid_generate_v4');
        if (!error && data) groupId = data as unknown as string;
      } catch {}
      if (!groupId) {
        groupId = (globalThis.crypto?.randomUUID?.() as string) || undefined;
      }

      const payloads = items.map(it => {
        const first = it.useMainGuest ? guestFirst.trim() : (it.guestFirst || '').trim();
        const last = it.useMainGuest ? guestLast.trim() : (it.guestLast || '').trim();
        if (!first || !last) throw new Error('Nome/Cognome mancanti su una riga camera con ospite diverso.');
        return {
          room_id: it.roomId,
          customer_id,
          kind,
          guest_firstname: first,
          guest_lastname: last,
          guest_phone: guestPhone.trim() || null,
          guest_email: guestEmail.trim() || null,
          check_in: checkIn,
          check_out: checkOut,
          pax: it.pax,
          rate_type: it.rateTypeRow,
          price: it.price,
          rooms_count: 1,
          notes: null as string | null,
          booking_group_id: groupId,
        };
      });

      const { error } = await supabase.from('bookings').insert(payloads);
      if (error) {
        alert('Errore salvataggio: ' + error.message);
        return;
      }

      alert('Prenotazione salvata.');
      router.push('/dashboard');
    } finally {
      setSaving(false);
    }
  }

  // ------------------ Cancellazione (SOFT DELETE con doppia conferma) ------------------
  
async function handleDelete(): Promise<void> {
  if (!isEdit || !editId) return;
  if (!confirm('Confermi la cancellazione della prenotazione?')) return;
  if (!confirm('⚠️ Conferma DEFINITIVA: la prenotazione finirà nel Cestino per 30 giorni.')) return;

  setDeleting(true);
  try {
    const res = await fetch(`/api/booking/${editId}/cancel`, { method: 'POST' });
    if (!res.ok) {
      const j: { error?: string } | null = await res.json().catch(() => null);
      alert(j?.error ?? res.statusText);
      return;
    }
    alert('Prenotazione spostata nel Cestino.');
    router.push('/dashboard');
  } finally {
    setDeleting(false);
  }
}

  // ------------------ UI ------------------
  return (
    <main className="ui-container space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          {isEdit ? `Modifica prenotazione #${editId}` : 'Nuova prenotazione'}
        </h1>

        <div className="flex items-center gap-2">
          {isEdit && (
            <button
              type="button"
              className="ui-btn ui-btn-danger"
              onClick={handleDelete}
              disabled={deleting || saving}
              title="Elimina prenotazione (soft delete)"
            >
              {deleting ? 'Eliminazione…' : 'Elimina prenotazione'}
            </button>
          )}
          <button
            type="button"
            className="ui-btn ui-btn-ghost"
            onClick={() => router.push('/dashboard')}
            disabled={deleting}
          >
            ← Torna alla dashboard
          </button>
        </div>
      </div>

      {loadError && <div className="ui-card text-sm text-red-600">{loadError}</div>}

      {loading ? (
        <div className="ui-card">Caricamento…</div>
      ) : (
        <form onSubmit={handleSubmit} className="ui-card space-y-6">
          {/* Cliente (solo in creazione) */}
          {!isEdit && (
            <div className="ui-row space-y-4">
              <div className="ui-section-title">Cliente</div>

              <div className="flex flex-wrap gap-6">
                <label className="ui-switch">
                  <input type="radio" checked={kind === 'individual'} onChange={() => setKind('individual')} />
                  Privato
                </label>
                <label className="ui-switch">
                  <input type="radio" checked={kind === 'company'} onChange={() => setKind('company')} />
                  Società / Ditta
                </label>
              </div>

              {kind === 'individual' ? (
                <div className="space-y-3">
                  <label className="ui-switch">
                    <input
                      type="checkbox"
                      checked={!useExistingIndividual}
                      onChange={e => setUseExistingIndividual(!e.target.checked)}
                    />
                    Crea nuova anagrafica (privato)
                  </label>

                  {useExistingIndividual ? (
                    <div>
                      <label className="ui-label">Seleziona privato esistente</label>
                      <select
                        className="ui-select"
                        value={individualId}
                        onChange={e => setIndividualId(e.target.value)}
                      >
                        <option value="">— Seleziona —</option>
                        {individuals.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.display_name} {c.phone ? `— ${c.phone}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="ui-grid-2">
                      <div>
                        <label className="ui-label">Nome e Cognome *</label>
                        <input
                          className="ui-input"
                          value={newIndividualName}
                          onChange={e => setNewIndividualName(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="ui-label">Telefono</label>
                        <input
                          className="ui-input"
                          value={newIndividualPhone}
                          onChange={e => setNewIndividualPhone(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="ui-label">Email</label>
                        <input
                          className="ui-input"
                          value={newIndividualEmail}
                          onChange={e => setNewIndividualEmail(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="ui-label">Note cliente (opz.)</label>
                        <input
                          className="ui-input"
                          value={newIndividualNotes}
                          onChange={e => setNewIndividualNotes(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="ui-switch">
                    <input
                      type="checkbox"
                      checked={!useExistingCompany}
                      onChange={e => setUseExistingCompany(!e.target.checked)}
                    />
                    Crea nuova anagrafica (società)
                  </label>

                  {useExistingCompany ? (
                    <div>
                      <label className="ui-label">Seleziona società esistente</label>
                      <select className="ui-select" value={companyId} onChange={e => setCompanyId(e.target.value)}>
                        <option value="">— Seleziona —</option>
                        {companies.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.display_name} {c.phone ? `— ${c.phone}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="ui-grid-2">
                      <div>
                        <label className="ui-label">Ragione sociale *</label>
                        <input
                          className="ui-input"
                          value={newCompanyName}
                          onChange={e => setNewCompanyName(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="ui-label">Telefono</label>
                        <input
                          className="ui-input"
                          value={newCompanyPhone}
                          onChange={e => setNewCompanyPhone(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="ui-label">Email</label>
                        <input
                          className="ui-input"
                          value={newCompanyEmail}
                          onChange={e => setNewCompanyEmail(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="ui-label">Note cliente (opz.)</label>
                        <input
                          className="ui-input"
                          value={newCompanyNotes}
                          onChange={e => setNewCompanyNotes(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Ospite principale */}
          <div className="ui-row ui-grid-2">
            <div>
              <label className="ui-label">Nome ospite principale *</label>
              <input
                className="ui-input"
                value={guestFirst}
                onChange={e => setGuestFirst(e.target.value)}
                required
                disabled={deleting}
              />
            </div>
            <div>
              <label className="ui-label">Cognome ospite principale *</label>
              <input
                className="ui-input"
                value={guestLast}
                onChange={e => setGuestLast(e.target.value)}
                required
                disabled={deleting}
              />
            </div>
            <div>
              <label className="ui-label">Telefono ospite</label>
              <input
                className="ui-input"
                value={guestPhone}
                onChange={e => setGuestPhone(e.target.value)}
                disabled={deleting}
              />
            </div>
            <div>
              <label className="ui-label">Email ospite</label>
              <input
                className="ui-input"
                value={guestEmail}
                onChange={e => setGuestEmail(e.target.value)}
                disabled={deleting}
              />
            </div>
          </div>

          {/* Soggiorno */}
          <div className="ui-row ui-grid-3">
            <div>
              <label className="ui-label">Check-in</label>
              <input
                type="date"
                className="ui-input"
                value={checkIn}
                onChange={e => setCheckIn(e.target.value)}
                required
                disabled={deleting}
              />
            </div>
            <div>
              <label className="ui-label">Check-out</label>
              <input
                type="date"
                className="ui-input"
                value={checkOut}
                onChange={e => setCheckOut(e.target.value)}
                required
                disabled={deleting}
              />
            </div>
            <div>
              <label className="ui-label">Pax predefinita nuove righe</label>
              <input
                type="number"
                min={1}
                max={4}
                className="ui-input"
                value={defaultPax}
                onChange={e => setDefaultPax(Math.min(4, Math.max(1, Number(e.target.value))))}
                disabled={deleting}
              />
              <div className="ui-hint">Usata come default quando aggiungi una camera</div>
            </div>
          </div>

          {/* Camere */}
          <div className="ui-row space-y-3">
            <div className="ui-row-head">
              <div className="ui-section-title">Camere</div>
              {!showAllRooms && !isEdit && (
                <button
                  type="button"
                  className="ui-btn ui-btn-ghost"
                  onClick={() => setShowAllRooms(true)}
                  disabled={deleting}
                >
                  Mostra tutte
                </button>
              )}
            </div>

            {items.map((it, idx) => {
              const opts = roomOptionsForRow(it.rateTypeRow);
              const convOpts = conventions.filter(c => c.active && c.rate_type === it.rateTypeRow);

              return (
                <div key={idx} className="ui-card space-y-3">
                  <div className="ui-grid-4">
                    <div>
                      <label className="ui-label">Camera</label>
                      <select
                        className="ui-select"
                        value={it.roomId}
                        onChange={e => updateItem(idx, { roomId: e.target.value })}
                        required
                        disabled={deleting}
                      >
                        <option value="">— Seleziona —</option>
                        {opts.map(r => (
                          <option key={r.id} value={r.id}>
                            Camera {r.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="ui-label">Pax per camera</label>
                      <input
                        type="number"
                        min={1}
                        max={4}
                        className="ui-input"
                        value={it.pax}
                        onChange={e => {
                          const p = Math.min(4, Math.max(1, Number(e.target.value)));
                          updateItem(idx, { pax: p });
                        }}
                        disabled={deleting}
                      />
                    </div>

                    <div>
                      <label className="ui-label">Convenzione</label>
                      <select
                        className="ui-select"
                        value={it.conventionId ?? ''}
                        onChange={e => updateItem(idx, { conventionId: e.target.value || null })}
                        disabled={isEdit || deleting}
                      >
                        <option value="">Listino standard ({RATE_LABEL[it.rateTypeRow]})</option>
                        {convOpts.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name} — €{Number(c.price).toFixed(2)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="ui-label">Prezzo riga (€)</label>
                      <input
                        type="number"
                        step={0.01}
                        min={0}
                        className="ui-input"
                        value={it.price}
                        onChange={e => updateItem(idx, { price: Number(e.target.value) })}
                        disabled={deleting}
                      />
                    </div>
                  </div>

                  {!isEdit && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        className="ui-btn ui-btn-danger"
                        onClick={() => removeItem(idx)}
                        disabled={items.length === 1 || deleting}
                      >
                        Rimuovi riga
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {!isEdit && (
              <div className="flex justify-end">
                <button type="button" className="ui-btn ui-btn-ghost" onClick={addItem} disabled={deleting}>
                  + Aggiungi camera
                </button>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center">
            <div className="ui-hint">Il prezzo riga segue pax e convenzione, ma può essere modificato manualmente.</div>
            <button className="ui-btn ui-btn-primary" disabled={saving || deleting}>
              {saving ? 'Salvataggio…' : isEdit ? 'Salva modifiche' : 'Salva prenotazione'}
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
