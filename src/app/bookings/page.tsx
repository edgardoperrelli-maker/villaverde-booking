export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { Suspense } from 'react';
import BookingsClient from './BookingsClient';

export default function Page() {
  return (
    <Suspense fallback={<div className="ui-card">Caricamento…</div>}>
      <BookingsClient />
    </Suspense>
  );
}
