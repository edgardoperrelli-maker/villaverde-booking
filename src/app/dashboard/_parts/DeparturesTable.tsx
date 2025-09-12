"use client";

import Link from "next/link";
import { useTransition } from "react";
import type { DepartureRow } from "./queries";

type Props = { bookings: DepartureRow[] };

export default function DeparturesTable({ bookings }: Props) {
  const [pending, startTransition] = useTransition();

  const onTogglePaid = (id: string, paid: boolean) => {
    startTransition(async () => {
      await fetch(`/api/booking/${id}/flags`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_status: paid ? "PAID" : "DUE" }),
      });
    });
  };

  return (
    <div className="overflow-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2">Camera</th>
            <th className="text-left">Ospite</th>
            <th className="text-center">Ha pagato</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {bookings.map((b) => (
            <tr key={b.id} className="border-b last:border-0">
              <td className="py-2">#{b.rooms?.name ?? String(b.room_id)}</td>
              <td>{b.guest_firstname} {b.guest_lastname}</td>
              <td className="text-center">
                <input
                  type="checkbox"
                  defaultChecked={b.payment_status === "PAID"}
                  onChange={(e) => onTogglePaid(b.id, e.currentTarget.checked)}
                  disabled={pending}
                />
              </td>
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

// (facoltativo) forza comunque il file a essere trattato come modulo:
// export {};
