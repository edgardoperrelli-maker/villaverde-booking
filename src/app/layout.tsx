// src/app/layout.tsx
import type { Metadata } from 'next';
import Image from 'next/image';
import './globals.css';

export const metadata: Metadata = {
  title: 'Villaverde Booking',
  description: 'Prenotazioni Villaverde',
  manifest: '/manifest.json',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body className="min-h-screen bg-white text-slate-900">
        <header className="border-b">
          <div className="mx-auto max-w-6xl flex items-center gap-3 p-3">
            <Image
              src="/icons/icon-192.png"
              alt="Villaverde"
              width={28}
              height={28}
              className="rounded"
              priority
            />
            <span className="font-semibold">Villaverde Booking</span>
          </div>
        </header>
        <main className="mx-auto max-w-6xl p-4">{children}</main>
      </body>
    </html>
  );
}
