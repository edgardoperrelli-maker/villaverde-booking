// src/app/dashboard/page.tsx  (SERVER COMPONENT)
export const dynamic = 'force-dynamic'; // evita SSG/prerender
export const revalidate = 0;            // niente cache ISR

import DashboardClient from './DashboardClient';

export default function Page() {
  return <DashboardClient />;
}