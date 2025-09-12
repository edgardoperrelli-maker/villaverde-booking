export const dynamic = "force-dynamic";
export const revalidate = 0;

import { supabaseAdmin } from "@/supabaseAdmin";

function daysInMonth(y: number, m: number) {
  return new Date(y, m + 1, 0).getDate();
}

export default async function CalendarPage() {
  const now = new Date();
  const year = now.getFullYear();

  const { data } = await supabaseAdmin
    .from("bookings")
    .select("check_in, check_out");

  const map = new Map<string, number>();
  (data ?? []).forEach((b) => {
    const s = new Date(b.check_in);
    const e = new Date(b.check_out);
    const start = new Date(Math.max(new Date(year, 0, 1).getTime(), s.getTime()));
    const end = new Date(Math.min(new Date(year + 1, 0, 1).getTime(), e.getTime()));
    for (let d = new Date(start.getFullYear(), start.getMonth(), start.getDate()); d < end; d.setDate(d.getDate() + 1)) {
      const k = d.toISOString().slice(0, 10);
      map.set(k, (map.get(k) ?? 0) + 1);
    }
  });

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Calendario {year}</h1>
      <div className="grid md:grid-cols-3 gap-6">
        {Array.from({ length: 12 }, (_, m) => (
          <div key={m} className="rounded-2xl border p-4">
            <div className="font-medium mb-2">
              {new Date(year, m, 1).toLocaleString(undefined, { month: "long" })}
            </div>
            <div className="grid grid-cols-7 gap-1 text-xs">
              {["L","M","M","G","V","S","D"].map((d) => (
                <div key={d} className="text-center text-gray-500">{d}</div>
              ))}
              {Array.from({ length: (new Date(year, m, 1).getDay() + 6) % 7 }).map((_, i) => <div key={`p${i}`} />)}
              {Array.from({ length: daysInMonth(year, m) }, (_, i) => i + 1).map((day) => {
                const d = new Date(year, m, day);
                const k = d.toISOString().slice(0, 10);
                const count = map.get(k) ?? 0;
                const cls = count === 0 ? "" : count < 4 ? "bg-emerald-100" : count < 8 ? "bg-emerald-200" : "bg-emerald-300";
                return (
                  <div key={day} className={`h-8 flex items-center justify-center rounded border ${cls}`} title={`${count} camere occupate`}>
                    {day}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
