import type { Metadata } from 'next';
import "./globals.css"
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Villaverde Booking',
  description: 'Prenotazioni Villaverde',
  manifest: '/manifest.json',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="it">
      <head>
       
      </head>
      <body className="min-h-screen bg-white text-slate-900">
        {children}
      </body>
    </html>
  );
}
