// Workshop directory and customer requests (Pošalji → Upiti). A customer sends one of their kitchens to up to 3 listed
// workshops; each workshop sees only requests sent to it, and the customer's e-mail only after taking the project.
// "Preuzmi projekat" makes the workshop's working copy (a workshop project) from the kitchen as it was sent.
// Offers: the workshop sends versions for a taken request (a new version supersedes the open one); the customer accepts
// (undo within 10 minutes) or declines.
// shortcut: sending is free here; Kroj Plus payment comes with the billing provider (CLAUDE.md, still open).
import crypto from 'node:crypto';
import { Router } from 'express';
import mongoose from 'mongoose';
import { auth } from './auth';
import { HttpError } from './http';
import { Membership, OfferModel, Organization, ProjectModel, RequestModel, User, type UserDoc } from './models';

const MAX_SHOPS = 3;
const UNDO_MS = 10 * 60_000;
const today = () => new Date().toISOString().slice(0, 10);
const SERVICES = ['m', 'mo', 'd', 'e'];
const oid = (v: unknown) => {
  if (typeof v !== 'string' || !mongoose.isValidObjectId(v)) throw new HttpError(404, 'not_found');
  return new mongoose.Types.ObjectId(v);
};
const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const int = (v: unknown, min: number, max: number) => (Number.isInteger(v) && (v as number) >= min && (v as number) <= max ? v as number : undefined);

type Org = InstanceType<typeof Organization>;
const card = (o: Org) => ({ id: o.id as string, name: o.name, ...(o.profile ? JSON.parse(JSON.stringify(o.profile)) : {}) });

async function member(user: UserDoc, orgId: unknown) {
  const m = await Membership.findOne({ userId: user._id, organizationId: oid(orgId) });
  if (!m) throw new HttpError(404, 'not_found');
  return m;
}

/** A request the user may see: a member of its workshop, or its customer. Anything else answers 404. */
async function requestFor(user: UserDoc, id: unknown) {
  const r = await RequestModel.findById(oid(id));
  if (!r) throw new HttpError(404, 'not_found');
  if (String(r.customerUserId) === String(user._id)) return { r, asShop: false };
  await member(user, String(r.organizationId));
  return { r, asShop: true };
}

type Offer = InstanceType<typeof OfferModel>;
const offerOut = (o: Offer | null | undefined) => o && ({
  id: o.id as string, version: o.version, total: o.total, vatPct: o.vatPct, validUntil: o.validUntil, advancePct: o.advancePct,
  included: o.included, excluded: o.excluded, leadTime: o.leadTime, note: o.note, status: o.status, decidedAt: o.decidedAt,
  createdAt: o.get('createdAt'), undoUntil: o.status === 'accepted' && o.decidedAt ? new Date(o.decidedAt.getTime() + UNDO_MS) : undefined,
});
/** The latest offer (any status but superseded) of a request. */
const latest = (requestId: mongoose.Types.ObjectId) => OfferModel.findOne({ requestId, status: { $ne: 'superseded' } }).sort({ version: -1 });

/** What a workshop sees: no customer e-mail before taking the project; how many other workshops got the same kitchen. */
async function forShop(r: InstanceType<typeof RequestModel>, full: boolean) {
  const customer = await User.findById(r.customerUserId);
  const others = await RequestModel.countDocuments({ batch: r.batch, _id: { $ne: r._id } });
  return {
    id: r.id as string, name: r.name, message: r.message, status: r.status, declineReason: r.declineReason, others,
    customer: customer?.name ?? '', contact: r.status === 'taken' ? customer?.email ?? '' : null,
    workshopProjectId: r.workshopProjectId, createdAt: r.get('createdAt'), offer: offerOut(await latest(r._id)), ...(full && { data: r.data }),
  };
}

export function requestRouter() {
  const r = Router();

  // Public directory (no sign-in): workshops that filled in their profile.
  r.get('/workshops', async (_req, res) => {
    res.send((await Organization.find({ 'profile.city': { $nin: ['', null] } }).sort({ name: 1 })).map(card));
  });
  r.get('/workshops/:id', async (req, res) => {
    const o = await Organization.findById(oid(req.params.id));
    if (!o?.profile?.city) throw new HttpError(404, 'not_found');
    res.send(card(o));
  });

  r.use(['/organizations', '/me', '/requests', '/offers'], auth);

  r.get('/organizations/:org/profile', async (req, res) => {
    const m = await member(req.user!, req.params.org);
    res.send(card((await Organization.findById(m.organizationId))!));
  });

  r.put('/organizations/:org/profile', async (req, res) => {
    const m = await member(req.user!, req.params.org);
    const o = (await Organization.findById(m.organizationId))!;
    const b = req.body ?? {};
    const name = text(b.name, 200);
    if (name) o.name = name;
    o.set('profile', {
      city: text(b.city, 100), about: text(b.about, 400),
      services: Array.isArray(b.services) ? SERVICES.filter(s => b.services.includes(s)) : [],
      km: int(b.km, 5, 150) ?? 30, leadFrom: int(b.leadFrom, 1, 52), leadTo: int(b.leadTo, 1, 52), open: b.open !== false,
    });
    await o.save();
    res.send(card(o));
  });

  // Customer: send one own kitchen to 1–3 listed workshops that take requests.
  r.post('/me/requests', async (req, res) => {
    const user = req.user!;
    const p = await ProjectModel.findById(oid(req.body?.projectId));
    if (!p || String(p.ownerUserId) !== String(user._id)) throw new HttpError(404, 'not_found');
    const ids: unknown[] = Array.isArray(req.body?.workshops) ? [...new Set(req.body.workshops)] : [];
    if (!ids.length) throw new HttpError(400, 'missing_workshops');
    if (ids.length > MAX_SHOPS) throw new HttpError(400, 'too_many_workshops');
    const shops = await Organization.find({ _id: { $in: ids.map(oid) }, 'profile.city': { $nin: ['', null] }, 'profile.open': { $ne: false } });
    if (shops.length !== ids.length) throw new HttpError(400, 'workshop_unavailable');
    const batch = crypto.randomUUID();
    const sent = await RequestModel.insertMany(shops.map(o => ({
      organizationId: o._id, customerUserId: user._id, projectId: p._id, batch, name: p.name, message: text(req.body?.message, 2000), data: p.data,
    })));
    res.status(201).send(sent.map(s => ({ id: s.id, workshop: shops.find(o => o._id.equals(s.organizationId))!.name, status: s.status })));
  });

  r.get('/me/requests', async (req, res) => {
    const list = await RequestModel.find({ customerUserId: req.user!._id }, { data: 0 }).sort({ createdAt: -1 }).populate<{ organizationId: Org }>('organizationId');
    res.send(await Promise.all(list.map(async x => ({
      id: x.id, name: x.name, status: x.status, declineReason: x.declineReason, workshop: x.organizationId?.name ?? '', workshopId: x.organizationId?.id,
      createdAt: x.get('createdAt'), takenAt: x.status === 'taken' ? x.get('updatedAt') : undefined, offer: offerOut(await latest(x._id)),
    }))));
  });

  // Workshop inbox.
  r.get('/organizations/:org/requests', async (req, res) => {
    const m = await member(req.user!, req.params.org);
    const list = await RequestModel.find({ organizationId: m.organizationId }, { data: 0 }).sort({ createdAt: -1 });
    // the list leaves `data` out (projection); forShop reads it only for the detail
    res.send(await Promise.all(list.map(x => forShop(x as unknown as InstanceType<typeof RequestModel>, false))));
  });

  r.get('/requests/:id', async (req, res) => {
    const { r: x, asShop } = await requestFor(req.user!, req.params.id);
    res.send(asShop ? await forShop(x, true) : { id: x.id, name: x.name, status: x.status, message: x.message, data: x.data });
  });

  r.post('/requests/:id/take', async (req, res) => {
    const { r: x, asShop } = await requestFor(req.user!, req.params.id);
    if (!asShop) throw new HttpError(404, 'not_found');
    if (x.status === 'declined') throw new HttpError(409, 'request_declined');
    if (!x.workshopProjectId) {
      const customer = await User.findById(x.customerUserId);
      const copy = await ProjectModel.create({ organizationId: x.organizationId, clientId: `${(x.data as { id?: string }).id ?? 'p'}-r${x.id.slice(-6)}`,
        name: x.name, customer: customer?.name ?? '', data: { ...(x.data as object), id: `${(x.data as { id?: string }).id ?? 'p'}-r${x.id.slice(-6)}` } });
      x.workshopProjectId = copy._id;
    }
    x.status = 'taken';
    await x.save();
    res.send(await forShop(x, false));
  });

  r.post('/requests/:id/decline', async (req, res) => {
    const { r: x, asShop } = await requestFor(req.user!, req.params.id);
    if (!asShop) throw new HttpError(404, 'not_found');
    if (x.status === 'taken') throw new HttpError(409, 'request_taken');
    x.status = 'declined';
    x.declineReason = text(req.body?.reason, 200);
    await x.save();
    res.send(await forShop(x, false));
  });
  // Workshop: a new offer version for a taken request.
  r.post('/requests/:id/offers', async (req, res) => {
    const { r: x, asShop } = await requestFor(req.user!, req.params.id);
    if (!asShop) throw new HttpError(404, 'not_found');
    if (x.status !== 'taken') throw new HttpError(409, 'request_not_taken');
    const b = req.body ?? {};
    const total = int(b.total, 1, 1e12);
    if (!total) throw new HttpError(400, 'missing_total');
    const prev = await latest(x._id);
    if (prev?.status === 'accepted') throw new HttpError(409, 'offer_accepted');
    if (prev?.status === 'sent') { prev.status = 'superseded'; await prev.save(); }
    const last = await OfferModel.findOne({ requestId: x._id }).sort({ version: -1 });
    const days = int(b.validDays, 1, 365) ?? 15;
    const o = await OfferModel.create({
      requestId: x._id, organizationId: x.organizationId, customerUserId: x.customerUserId, version: (last?.version ?? 0) + 1, total,
      vatPct: int(b.vatPct, 0, 100) ?? 20, validUntil: new Date(Date.now() + days * 86400000).toISOString().slice(0, 10),
      advancePct: int(b.advancePct, 0, 100) ?? 0, included: text(b.included, 500), excluded: text(b.excluded, 500), leadTime: text(b.leadTime, 200), note: text(b.note, 1000),
    });
    res.status(201).send(offerOut(o));
  });

  /** An offer the signed-in customer owns; workshops and other customers get 404. */
  async function myOffer(user: UserDoc, id: unknown) {
    const o = await OfferModel.findById(oid(id));
    if (!o || String(o.customerUserId) !== String(user._id)) throw new HttpError(404, 'not_found');
    return o;
  }

  r.post('/offers/:id/accept', async (req, res) => {
    const o = await myOffer(req.user!, req.params.id);
    if (o.status !== 'sent') throw new HttpError(409, 'offer_closed');
    if (o.validUntil < today()) throw new HttpError(409, 'offer_expired');
    o.status = 'accepted'; o.decidedAt = new Date();
    await o.save();
    res.send(offerOut(o));
  });

  r.post('/offers/:id/undo', async (req, res) => {
    const o = await myOffer(req.user!, req.params.id);
    if (o.status !== 'accepted' || !o.decidedAt || Date.now() - o.decidedAt.getTime() > UNDO_MS) throw new HttpError(409, 'undo_expired');
    o.status = 'sent'; o.decidedAt = undefined;
    await o.save();
    res.send(offerOut(o));
  });

  r.post('/offers/:id/decline', async (req, res) => {
    const o = await myOffer(req.user!, req.params.id);
    if (o.status !== 'sent') throw new HttpError(409, 'offer_closed');
    o.status = 'declined'; o.decidedAt = new Date();
    await o.save();
    res.send(offerOut(o));
  });
  return r;
}
