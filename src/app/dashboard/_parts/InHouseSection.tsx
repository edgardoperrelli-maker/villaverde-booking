export const dynamic = 'force-dynamic';
export const revalidate = 0;

import PresentiTable from './PresentiTable';
import DeparturesTable from './DeparturesTable';
import {
  getInHouse,
  getDeparturesToday,
  addDays,
  startOfDay,
  type InHouseRow,
  type DepartureRow,
} from './queries';

export default async function InHouseSection() {
  const today = startOfDay();

  const [inHouseToday, inHouseTomorrow, departures]: [
    InHouseRow[],
    InHouseRow[],
    DepartureRow[],
  ] = await Promise.all([
    getInHouse(today),
    getInHouse(addDays(today, 1)),
    getDeparturesToday(today),
  ]);

  return (
    <div className="grid md:grid-cols-2 gap-6 mt-6">
      <section className="rounded-2xl border p-4">
        <h3 className="font-semibold mb-3">Presenti oggi</h3>
        <PresentiTable bookings={inHouseToday} showBreakfast />
      </section>

      <section className="rounded-2xl border p-4">
        <h3 className="font-semibold mb-3">Presenti domani</h3>
        <PresentiTable bookings={inHouseTomorrow} showPaxOnly />
      </section>

      <section className="rounded-2xl border p-4 md:col-span-2">
        <h3 className="font-semibold mb-3">Partenze oggi</h3>
        <DeparturesTable bookings={departures} />
      </section>
    </div>
  );
}
