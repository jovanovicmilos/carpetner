// Workshops (organizations), their plan (grants → engine entitlements) and their projects; customers' own projects (/me).
// Isolation rule: every project query goes through `memberOf` / `projectFor`, which check the signed-in user's membership;
// a project of another workshop answers 404 exactly like a missing one.
import { entitlements, limit, workshopSignup } from 'engine';
import { Router } from 'express';
import mongoose from 'mongoose';
import { auth } from './auth';
import { HttpError, email, str } from './http';
import { inviteMail } from './mail';
import { GrantModel, InviteModel, Membership, Organization, ProjectModel, RequestModel, User, type UserDoc } from './models';

const today = () => new Date().toISOString().slice(0, 10);
const oid = (v: unknown) => {
  if (typeof v !== 'string' || !mongoose.isValidObjectId(v)) throw new HttpError(404, 'not_found');
  return new mongoose.Types.ObjectId(v);
};

async function memberOf(user: UserDoc, orgId: unknown) {
  const m = await Membership.findOne({ userId: user._id, organizationId: oid(orgId) });
  if (!m) throw new HttpError(404, 'not_found');
  return m;
}

/** A customer's kitchen shared with the user's workshop: a request of it that the workshop took (shared session). */
async function sharedWith(user: UserDoc, projectId: mongoose.Types.ObjectId) {
  const orgs = await RequestModel.distinct('organizationId', { workshopProjectId: projectId, status: 'taken' });
  return orgs.length > 0 && !!await Membership.exists({ userId: user._id, organizationId: { $in: orgs } });
}

/** The project if the user may see it: a member of its workshop, its customer owner, or the workshop sharing it. */
async function projectFor(user: UserDoc, id: unknown) {
  const p = await ProjectModel.findById(oid(id));
  if (!p) throw new HttpError(404, 'not_found');
  if (p.organizationId) await memberOf(user, String(p.organizationId));
  else if (String(p.ownerUserId) !== String(user._id) && !await sharedWith(user, p._id)) throw new HttpError(404, 'not_found');
  return p;
}

async function ownerOf(user: UserDoc, orgId: unknown) {
  const m = await memberOf(user, orgId);
  if (m.role !== 'owner') throw new HttpError(403, 'owner_only');
  return m;
}

const grantsOf = async (orgId: mongoose.Types.ObjectId) => (await GrantModel.find({ organizationId: orgId }).lean())
  .map(({ product, from, to, quantity, trial }) => ({ product, from, ...(to && { to }), ...(quantity && { quantity }), ...(trial && { trial }) }));

async function plan(orgId: mongoose.Types.ObjectId) {
  const grants = await grantsOf(orgId);
  const e = entitlements(grants, today());
  return { grants, features: [...e.features], limits: e.limits };
}

/** Fields of a project a client may write; `data` is the engine Project (validated by the app, stored as is). */
function projectFields(body: Record<string, unknown> | undefined, create: boolean) {
  const out: Record<string, unknown> = {};
  if (body?.data !== undefined || create) {
    if (!body?.data || typeof body.data !== 'object' || Array.isArray(body.data)) throw new HttpError(400, 'missing_data');
    out.data = body.data;
    const id = (body.data as { id?: unknown }).id;
    if (typeof id === 'string') out.clientId = id;
  }
  for (const k of ['name', 'customer', 'status'] as const) if (typeof body?.[k] === 'string') out[k] = (body[k] as string).slice(0, 200);
  for (const k of ['resume', 'progress'] as const) if (body?.[k] !== undefined) out[k] = body[k];
  return out;
}

const listItem = (p: { id: string; clientId?: string | null; name: string; customer: string; status: string; resume?: unknown; progress?: unknown; updatedAt?: Date }) => ({ id: p.id, clientId: p.clientId, name: p.name, customer: p.customer, status: p.status, resume: p.resume, progress: p.progress, updatedAt: p.updatedAt });

/** New workshop: the user is its owner; Start for good + Pro for the 30-day trial (billing.ts workshopSignup). */
export async function createWorkshop(user: UserDoc, name: string) {
  const org = await Organization.create({ name });
  await Membership.create({ userId: user._id, organizationId: org._id, role: 'owner' });
  await GrantModel.insertMany(workshopSignup(today()).map(g => ({ ...g, organizationId: org._id })));
  return { id: org.id as string, name: org.name, role: 'owner', ...await plan(org._id) };
}

/** Open invitations for this (proven) address become memberships; called whenever a session starts. */
export async function claimInvites(user: UserDoc) {
  if (!user.verified) return;
  const open = await InviteModel.find({ email: user.email });
  for (const i of open) await Membership.updateOne({ userId: user._id, organizationId: i.organizationId }, { $setOnInsert: { role: i.role } }, { upsert: true });
  if (open.length) await InviteModel.deleteMany({ _id: { $in: open.map(i => i._id) } });
}

/** Role from a request body; anything but "designer" needs the plan's roles feature (Premium). */
function roleOf(body: Record<string, unknown> | undefined, roles: boolean) {
  const r = body?.role ?? 'designer';
  if (r !== 'owner' && r !== 'designer') throw new HttpError(400, 'invalid_role');
  if (r === 'owner' && !roles) throw new HttpError(403, 'feature_locked');
  return r;
}

/** A workshop always keeps at least one owner. */
async function keepOwner(t: { role?: string | null; organizationId: mongoose.Types.ObjectId }) {
  if (t.role === 'owner' && await Membership.countDocuments({ organizationId: t.organizationId, role: 'owner' }) <= 1) throw new HttpError(409, 'last_owner');
}

export function workshopRouter() {
  const r = Router();
  r.use(['/organizations', '/projects', '/me'], auth);

  r.post('/organizations', async (req, res) => void res.status(201).send(await createWorkshop(req.user!, str(req.body, 'name'))));

  r.get('/organizations', async (req, res) => {
    const ms = await Membership.find({ userId: req.user!._id }).populate<{ organizationId: InstanceType<typeof Organization> }>('organizationId');
    res.send(await Promise.all(ms.filter(m => m.organizationId).map(async m => ({ id: m.organizationId.id, name: m.organizationId.name, role: m.role, ...await plan(m.organizationId._id) }))));
  });

  // Korisnici i uloge: every member sees the team; only owners change it.
  r.get('/organizations/:org/members', async (req, res) => {
    const m = await memberOf(req.user!, req.params.org);
    const ms = await Membership.find({ organizationId: m.organizationId }).populate<{ userId: UserDoc }>('userId', 'name email');
    const invites = await InviteModel.find({ organizationId: m.organizationId }).sort({ createdAt: 1 });
    res.send({
      members: ms.filter(x => x.userId).map(x => ({ id: String(x.userId._id), name: x.userId.name, email: x.userId.email, role: x.role })),
      invites: invites.map(i => ({ id: i.id as string, email: i.email, role: i.role })),
    });
  });

  // An existing account joins at once; a new address gets an invitation that its first sign-in claims (claimInvites).
  // Seats (plan limit "users") count members and open invitations.
  r.post('/organizations/:org/invites', async (req, res) => {
    const m = await ownerOf(req.user!, req.params.org);
    const org = m.organizationId, mail = email(req.body);
    const e = entitlements(await grantsOf(org), today());
    const role = roleOf(req.body, e.features.has('users.roles'));
    const [members, open] = await Promise.all([Membership.countDocuments({ organizationId: org }), InviteModel.countDocuments({ organizationId: org })]);
    const seats = limit(e, 'users'), invites = limit(e, 'invites.active');
    if (seats !== null && members + open >= seats) throw new HttpError(403, 'users_limit');
    const name = (await Organization.findById(org))!.name;
    const user = await User.findOne({ email: mail }) as UserDoc | null;
    if (user) {
      if (await Membership.exists({ userId: user._id, organizationId: org })) throw new HttpError(409, 'already_member');
      await Membership.create({ userId: user._id, organizationId: org, role });
      await inviteMail(mail, name, true);
      return void res.status(201).send({ member: { id: String(user._id), name: user.name, email: user.email, role } });
    }
    if (await InviteModel.exists({ organizationId: org, email: mail })) throw new HttpError(409, 'already_invited');
    if (invites !== null && open >= invites) throw new HttpError(403, 'invites_limit');
    const i = await InviteModel.create({ organizationId: org, email: mail, role });
    await inviteMail(mail, name, false);
    res.status(201).send({ invite: { id: i.id as string, email: i.email, role: i.role } });
  });

  r.delete('/organizations/:org/invites/:id', async (req, res) => {
    const m = await ownerOf(req.user!, req.params.org);
    await InviteModel.deleteOne({ _id: oid(req.params.id), organizationId: m.organizationId });
    res.status(204).send();
  });

  r.patch('/organizations/:org/members/:user', async (req, res) => {
    const m = await ownerOf(req.user!, req.params.org);
    const role = roleOf(req.body, entitlements(await grantsOf(m.organizationId), today()).features.has('users.roles'));
    const t = await Membership.findOne({ organizationId: m.organizationId, userId: oid(req.params.user) });
    if (!t) throw new HttpError(404, 'not_found');
    if (role !== 'owner') await keepOwner(t);
    t.role = role; await t.save();
    res.send({ id: req.params.user, role });
  });

  // Owners remove anyone; a member may leave by themselves.
  r.delete('/organizations/:org/members/:user', async (req, res) => {
    const m = await memberOf(req.user!, req.params.org);
    if (m.role !== 'owner' && String(req.user!._id) !== req.params.user) throw new HttpError(403, 'owner_only');
    const t = await Membership.findOne({ organizationId: m.organizationId, userId: oid(req.params.user) });
    if (!t) throw new HttpError(404, 'not_found');
    await keepOwner(t);
    await t.deleteOne();
    res.status(204).send();
  });

  r.get('/organizations/:org/projects', async (req, res) => {
    const m = await memberOf(req.user!, req.params.org);
    // its own projects + customers' kitchens it took (edited together with the customer)
    const shared = await RequestModel.distinct('workshopProjectId', { organizationId: m.organizationId, status: 'taken' });
    res.send((await ProjectModel.find({ $or: [{ organizationId: m.organizationId }, { _id: { $in: shared } }] }, { data: 0 }).sort({ updatedAt: -1 })).map(listItem));
  });

  r.post('/organizations/:org/projects', async (req, res) => {
    const m = await memberOf(req.user!, req.params.org);
    const p = await ProjectModel.create({ ...projectFields(req.body, true), organizationId: m.organizationId });
    res.status(201).send({ ...listItem(p), data: p.data });
  });

  // A customer's own kitchens (any signed-in user may keep them; workshops use their organization's list).
  r.get('/me/projects', async (req, res) => {
    res.send((await ProjectModel.find({ ownerUserId: req.user!._id }, { data: 0 }).sort({ updatedAt: -1 })).map(listItem));
  });

  r.post('/me/projects', async (req, res) => {
    const p = await ProjectModel.create({ ...projectFields(req.body, true), ownerUserId: req.user!._id });
    res.status(201).send({ ...listItem(p), data: p.data });
  });

  r.get('/projects/:id', async (req, res) => {
    const p = await projectFor(req.user!, req.params.id);
    if (req.query.since === p.updatedAt?.toISOString()) return void res.status(204).send(); // live polling: unchanged
    res.send({ ...listItem(p), data: p.data });
  });

  r.put('/projects/:id', async (req, res) => {
    const p = await projectFor(req.user!, req.params.id);
    const fields = projectFields(req.body, false);
    if (!p.organizationId && String(p.ownerUserId) !== String(req.user!._id)) delete fields.resume; // the workshop's last screen is not the customer's
    // `base` = the updatedAt this edit started from: saved only if nobody saved since (shared session), else 409 and the
    // client merges (engine merge3) and sends again. Atomic, so two saves at once cannot both pass.
    const base = typeof req.body?.base === 'string' ? new Date(req.body.base) : null;
    const saved = await ProjectModel.findOneAndUpdate({ _id: p._id, ...(base && { updatedAt: base }) }, { $set: fields }, { returnDocument: 'after' });
    if (!saved) throw new HttpError(409, 'conflict');
    res.send(listItem(saved));
  });

  r.delete('/projects/:id', async (req, res) => {
    const p = await projectFor(req.user!, req.params.id);
    if (!p.organizationId && String(p.ownerUserId) !== String(req.user!._id)) throw new HttpError(403, 'owner_only'); // a shared kitchen stays the customer's
    await p.deleteOne();
    res.status(204).send();
  });
  return r;
}
