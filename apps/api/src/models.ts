// Collections (docs/MARKETPLACE.md; same shape as the parked Supabase draft): users, organizations (workshops), memberships,
// projects (engine `Project` JSON, one source of truth) and grants (billing.ts). Products are engine DEFAULT_PRODUCTS.
import bcrypt from 'bcryptjs';
import mongoose, { Schema, type InferSchemaType, type HydratedDocument } from 'mongoose';

const userSchema = new Schema({
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  name: { type: String, required: true, trim: true },
  /** Empty for Google accounts until they set one through "Zaboravljena lozinka". */
  password: { type: String },
  kind: { type: String, enum: ['workshop_member', 'customer'], default: 'workshop_member' },
  /** Workshop name typed at sign-up (Prijava → Nova radionica); the workshop is made when the e-mail is confirmed. */
  pendingWorkshop: { type: String, trim: true, maxlength: 200 },
  verified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  // shortcut: tokens stored as issued (like arbyte-api), last 10 sessions; hash them if the database may ever leak.
  accessTokens: { type: [String], default: [] },
  refreshTokens: { type: [String], default: [] },
}, { timestamps: true });

userSchema.pre('save', async function () {
  if (this.isModified('password') && this.password) this.password = await bcrypt.hash(this.password, 10);
});
userSchema.methods.checkPassword = function (p: string) { return this.password ? bcrypt.compare(p, this.password) : Promise.resolve(false); };
userSchema.set('toJSON', {
  transform: (_doc, u: Record<string, unknown>) => {
    u.hasPassword = !!u.password;
    delete u.password; delete u.accessTokens; delete u.refreshTokens; delete u.__v;
    return u;
  },
});

export type UserDoc = HydratedDocument<InferSchemaType<typeof userSchema>> & { checkPassword(p: string): Promise<boolean> };
export const User = mongoose.model('User', userSchema);

export const Organization = mongoose.model('Organization', new Schema({
  name: { type: String, required: true, trim: true, maxlength: 200 },
  defaultPreset: { type: String, default: 'workshop' },
  /** Public profile (Podešavanja → Profil radionice). Listed in the directory once `city` is set; `open: false` = paused. */
  profile: {
    city: { type: String, default: '' },
    about: { type: String, default: '' },
    services: { type: [String], default: [] },
    km: { type: Number, default: 30 },
    leadFrom: { type: Number },
    leadTo: { type: Number },
    open: { type: Boolean, default: true },
  },
}, { timestamps: true }));

/** A customer's kitchen sent to one workshop. `data` is the project as it was when sent (the customer may keep editing). */
export const RequestModel = mongoose.model('Request', new Schema({
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  customerUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  /** Same id for the requests of one sending (to up to 3 workshops): "Poslato i drugim". */
  batch: { type: String, required: true, index: true },
  name: { type: String, default: '' },
  message: { type: String, default: '' },
  data: { type: Schema.Types.Mixed, required: true },
  status: { type: String, enum: ['new', 'taken', 'declined'], default: 'new' },
  declineReason: { type: String },
  /** Room photos sent with the kitchen (FileModel ids; one sending = the same photos for every workshop of the batch). */
  photos: { type: [Schema.Types.ObjectId], default: [] },
  /** The workshop's working copy made by "Preuzmi projekat". */
  workshopProjectId: { type: Schema.Types.ObjectId, ref: 'Project' },
  /** Saradnja read marks per side: messages of the other side after it are unread. */
  shopReadAt: { type: Date },
  custReadAt: { type: Date },
  /** Shared session presence per side: { at, since, typing, screen, name } (thread polling; live.ts). */
  here: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true, minimize: false }));

export const Membership = mongoose.model('Membership', new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
  role: { type: String, enum: ['owner', 'designer'], default: 'designer' },
}).index({ userId: 1, organizationId: 1 }, { unique: true }));

/** An open invitation to a workshop for an address without an account; it becomes a Membership when that address signs in. */
export const InviteModel = mongoose.model('Invite', new Schema({
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  role: { type: String, enum: ['owner', 'designer'], default: 'designer' },
}, { timestamps: true }).index({ organizationId: 1, email: 1 }, { unique: true }).index({ email: 1 }));

/** Exactly one owner: a workshop (organizationId) or a customer (ownerUserId). */
export const ProjectModel = mongoose.model('Project', new Schema({
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
  ownerUserId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  /** The engine Project's own `id` (the app's key; projects made offline keep it). */
  clientId: { type: String, index: true },
  name: { type: String, default: '' },
  customer: { type: String, default: '' },
  data: { type: Schema.Types.Mixed, required: true },
  resume: { type: Schema.Types.Mixed },
  progress: { type: Schema.Types.Mixed },
  status: { type: String, default: 'active' },
}, { timestamps: true, minimize: false }));

/** A workshop's offer for a taken request. Versions per request; a new one supersedes the open one. Money in para. */
export const OfferModel = mongoose.model('Offer', new Schema({
  requestId: { type: Schema.Types.ObjectId, ref: 'Request', required: true, index: true },
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
  customerUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  version: { type: Number, required: true },
  total: { type: Number, required: true },
  vatPct: { type: Number, default: 20 },
  validUntil: { type: String, required: true },
  advancePct: { type: Number, default: 0 },
  included: { type: String, default: '' },
  excluded: { type: String, default: '' },
  leadTime: { type: String, default: '' },
  note: { type: String, default: '' },
  status: { type: String, enum: ['sent', 'accepted', 'declined', 'superseded'], default: 'sent' },
  decidedAt: { type: Date },
  // The quote PDF the workshop made when sending (its prices live in its browser, so the customer cannot rebuild it).
  // shortcut: stored in the offer document (≤ 4 MB) until file storage exists; move it there with room photos.
  pdf: { type: Buffer, select: false },
  pdfSize: { type: Number, default: 0 },
}, { timestamps: true }));

/** Saradnja: a message on a request, from the workshop or the customer; `pin` = the unit it is about ("D4 Fioke").
 * kind 'edit' = an edit of the shared kitchen (live.ts): `edit` = { id, before, after } of one unit, or { id: 'room' }. */
export const MessageModel = mongoose.model('Message', new Schema({
  requestId: { type: Schema.Types.ObjectId, ref: 'Request', required: true, index: true },
  side: { type: String, enum: ['shop', 'cust'], required: true },
  authorUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  kind: { type: String, enum: ['msg', 'edit'], default: 'msg' },
  text: { type: String, default: '' },
  pin: { type: String },
  edit: { type: Schema.Types.Mixed },
}, { timestamps: true }));

/** billing.ts `Grant`, stored per workshop (or per customer user). Dates are ISO `YYYY-MM-DD`, `to` exclusive. */
export const GrantModel = mongoose.model('Grant', new Schema({
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  product: { type: String, required: true },
  from: { type: String, required: true },
  to: { type: String },
  quantity: { type: Number },
  project: { type: String },
  trial: { type: Boolean },
}, { timestamps: true }));

/** Uploaded files (room photos). shortcut: bytes live in Mongo (≤ 1 MB each, no disk / bucket to run); move to object
 * storage (R2 / S3) at deployment if photos grow, together with the offer PDF. */
export const FileModel = mongoose.model('File', new Schema({
  ownerUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, required: true },
  size: { type: Number, required: true },
  data: { type: Buffer, required: true },
}, { timestamps: true }));
