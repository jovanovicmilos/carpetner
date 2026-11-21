// The other side of a project's shared session (user 2026-11-21): only once the customer sent the kitchen to a workshop and
// the workshop took the request. Customer: the request of this kitchen with status "taken" → the workshop's name;
// workshop: the request whose working copy is this project → the customer's name. Otherwise null (no session).
import { useEffect, useState } from 'react';
import { useProjects } from './projects';
import { api, useSession } from './session';

type Req = { status: string; projectId?: string; workshopProjectId?: string; workshop?: string; customer?: string };

export function usePartner(projectId?: string): string | null {
  const serverId = useProjects(s => (projectId ? s.list[projectId]?.serverId : undefined));
  const customer = useSession(s => s.session?.user.kind === 'customer');
  const shopId = useSession(s => (s.session && s.session.user.kind !== 'customer' ? s.workshops[0]?.id : undefined));
  const [partner, setPartner] = useState<string | null>(null);
  useEffect(() => {
    setPartner(null);
    if (!serverId || (!customer && !shopId)) return;
    const mine = (r: Req) => r.status === 'taken' && (customer ? r.projectId === serverId : r.workshopProjectId === serverId);
    api<Req[]>('GET', customer ? '/me/requests' : `/organizations/${shopId}/requests`)
      .then(l => { const r = l.find(mine); setPartner(r ? (customer ? r.workshop : r.customer) || null : null); })
      .catch(() => {});
  }, [serverId, customer, shopId]);
  return partner;
}
