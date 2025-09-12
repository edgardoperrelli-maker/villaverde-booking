"use client";

import { useState, useTransition } from "react";
import Link from "next/link";

type BookingRow = {
  id: string;
  pax: number;
  guest_firstname: string;
  guest_lastname: string;
  breakfast_done?: boolean | null;
  rooms?: { name: string } | null;
  room_id: number | string;
};

export default function PresentiTable({
  bookings,
  showBreakfast = false,
  showPaxOnly = false,
}: {
  bookings: BookingRow[];
  showBreakfast?: boolean;
  showPaxOnly?: boolean;
}) {
  const [local, setLocal] = useState(bookings);
  const [isPending, start] = useTransition();

  async function toggleBreakfast(id: string, v: boolean) {
    setLocal((prev) => prev.map((b) => (b.id === id ? { ...b, breakfast_done: v } : b)));
    start(async () => {
      await fetch(`/api/booking/${id}/flags`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ breakfast_done: v }),
      });
    });
  }

  return (
    <div className="overflow-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2">Camera</th>
            <th className="text-left">Ospite</th>
            <th className="text-left">{showPaxOnly ? "Pax" : "Soggiorno"}</th>
            {showBreakfast && <th className="text-center">Colazione</th>}
            <th />
          </tr>
        </thead>
        <tbody>
          {local.map((b) => (
            <tr key={b.id} className="border-b last:border-0">
              <td className="py-2">#{b.rooms?.name ?? String(b.room_id)}</td>
              <td>{b.guest_firstname} {b.guest_lastname}</td>
              <td>{showPaxOnly ? b.pax : "in corso"}</td>
              {showBreakfast && (
                <td className="text-center">
                  <input
                    type="checkbox"
                    checked={Boolean(b.breakfast_done)}
                    onChange={(e) => toggleBreakfast(b.id, e.target.checked)}
                    disabled={isPending}
                  />
                </td>
              )}
              <td className="text-right">
                <Link href={`/bookings/${b.id}`} className="underline">Apri</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
