// Workshops (organizations), their plan (grants → engine entitlements) and their projects.
// Isolation rule: every project query goes through `memberOf` / `projectFor`, which check the signed-in user's membership;
// a project of another workshop answers 404 exactly like a missing one.
import { entitlements, workshopSignup } from 'engine';
import { Router } from 'express';
import mongoose from 'mongoose';
import { auth } from './auth';
import { HttpError, str } from './http';
import { GrantModel, Membership, Organization, ProjectModel, type UserDoc } from './models';

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

/** The project if the user may see it: a member of its workshop, or its customer owner. */
async function projectFor(user: UserDoc, id: unknown) {
  const p = await ProjectModel.findById(oid(id));
  if (!p) throw new HttpError(404, 'not_found');
  if (p.organizationId) await memberOf(user, String(p.organizationId));
  else if (String(p.ownerUserId) !== String(user._id)) throw new HttpError(404, 'not_found');
  return p;
}

async function plan(orgId: mongoose.Types.ObjectId) {
  const grants = (await GrantModel.find({ organizationId: orgId }).lean())
    .map(({ product, from, to, quantity, trial }) => ({ product, from, ...(to && { to }), ...(quantity && { quantity }), ...(trial && { trial }) }));
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

export function workshopRouter() {
  const r = Router();
  r.use(['/organizations', '/projects'], auth);

  r.post('/organizations', async (req, res) => void res.status(201).send(await createWorkshop(req.user!, str(req.body, 'name'))));

  r.get('/organizations', async (req, res) => {
    const ms = await Membership.find({ userId: req.user!._id }).populate<{ organizationId: InstanceType<typeof Organization> }>('organizationId');
    res.send(await Promise.all(ms.filter(m => m.organizationId).map(async m => ({ id: m.organizationId.id, name: m.organizationId.name, role: m.role, ...await plan(m.organizationId._id) }))));
  });

  r.get('/organizations/:org/projects', async (req, res) => {
    const m = await memberOf(req.user!, req.params.org);
    res.send((await ProjectModel.find({ organizationId: m.organizationId }, { data: 0 }).sort({ updatedAt: -1 })).map(listItem));
  });

  r.post('/organizations/:org/projects', async (req, res) => {
    const m = await memberOf(req.user!, req.params.org);
    const p = await ProjectModel.create({ ...projectFields(req.body, true), organizationId: m.organizationId });
    res.status(201).send({ ...listItem(p), data: p.data });
  });

  r.get('/projects/:id', async (req, res) => {
    const p = await projectFor(req.user!, req.params.id);
    res.send({ ...listItem(p), data: p.data });
  });

  r.put('/projects/:id', async (req, res) => {
    const p = await projectFor(req.user!, req.params.id);
    const fields = projectFields(req.body, false);
    p.set(fields);
    if ('data' in fields) p.markModified('data'); // Mixed: Mongoose does not see changes inside it
    await p.save();
    res.send(listItem(p));
  });

  r.delete('/projects/:id', async (req, res) => {
    const p = await projectFor(req.user!, req.params.id);
    await p.deleteOne();
    res.status(204).send();
  });
  return r;
}
