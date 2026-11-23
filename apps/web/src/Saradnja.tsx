// `/saradnja` without a request: the signed-out preview of Saradnja (design/screens/Saradnja.html, redesign 2026-11-23) with the
// shared example kitchen; `?kao=kupac` = the customer's side. Real requests open `/saradnja/:id` (SaradnjaLive).
import { useSearchParams } from 'react-router';
import fixture from '../../../fixtures/kuhinja-petrovic.json';
import { fromDataModel, type DataModelProject } from 'engine';
import type { Thread } from './live';
import { Screen } from './SaradnjaLive';

const kitchen = { ...fromDataModel(fixture.project as unknown as DataModelProject), name: 'Ugaona L' };
const d = kitchen.elements.find(e => e.id === 'D4')!;

export function Saradnja() {
  const [q] = useSearchParams();
  const side = q.get('kao') === 'kupac' ? 'cust' : 'shop';
  const t: Thread = {
    id: 'demo', side, name: kitchen.name, status: 'taken', workshop: 'Radionica Hrast', customer: 'Miloš Jovanović', here: null, unread: 0, photos: 3, sent: kitchen,
    createdAt: '2026-11-18T10:00:00Z', takenAt: '2026-11-19T09:00:00Z',
    offers: [
      { id: 'v1', version: 1, status: 'superseded', total: 25430000, validUntil: '2026-12-03', note: 'Prva procena', hasPdf: true, createdAt: '2026-11-19T12:00:00Z' },
      { id: 'v2', version: 2, status: 'sent', total: 26806600, validUntil: '2026-12-06', note: 'Posle merenja: fioke 2 × 30', hasPdf: true, createdAt: '2026-11-22T12:00:00Z' },
    ],
    messages: [
      { id: 'e1', side: 'shop', kind: 'edit', text: '', by: 'Petar Stanić', edit: { id: 'G4', before: null, after: kitchen.elements.find(e => e.id === 'G4') }, createdAt: '2026-11-22T15:00:00Z', at: '2026-11-22T15:00:00Z' },
      { id: 'e2', side: 'cust', kind: 'edit', text: '', by: 'Miloš Jovanović', edit: { id: 'D4', before: d, after: { ...d, width: 500 } }, createdAt: '2026-11-23T12:06:00Z', at: '2026-11-23T12:06:00Z' },
    ],
  };
  return <Screen t={t} kitchen={kitchen} open={() => {}} demo />;
}
