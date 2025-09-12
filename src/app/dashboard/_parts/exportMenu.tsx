"use client";
import { useState } from "react";

export default function ExportMenu() {
  const [open, setOpen] = useState(false);
  const base = "/api/booking/export?scope=";

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="border rounded px-3 py-2">
        Export ▼
      </button>
      {open && (
        <div className="absolute z-10 mt-2 w-40 rounded border bg-white shadow">
          <a className="block px-3 py-2 hover:bg-gray-50" href={`${base}today`}>Oggi</a>
          <a className="block px-3 py-2 hover:bg-gray-50" href={`${base}past`}>Passate</a>
          <a className="block px-3 py-2 hover:bg-gray-50" href={`${base}future`}>Future</a>
        </div>
      )}
    </div>
  );
}
