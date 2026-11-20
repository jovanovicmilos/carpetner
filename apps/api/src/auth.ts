// Accounts, taken over from arbyte-api (same flow): register → e-mail confirmation → login with access + refresh token,
// refresh rotation, logout, password change / reset by e-mail, Google sign-in (OpenID Connect).
// Every token carries a `purpose`, so an e-mail token is never accepted as a session and the other way round.
import crypto from 'node:crypto';
import { Router, type RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { HttpError, email, password, str } from './http';
import { resetMail, verifyMail } from './mail';
import { User, type UserDoc } from './models';
import { createWorkshop } from './workshops';
import { limits } from './rateLimit';

type Purpose = 'access' | 'refresh' | 'verify' | 'reset' | 'oauth';
const secret = () => { const s = process.env.SECRET; if (!s) throw new Error('SECRET is not set'); return s; };
const SESSIONS = 10;

export const sign = (id: unknown, purpose: Purpose, expiresIn: number, extraSecret = '') =>
  // jwtid: two tokens signed in the same second must differ (refresh rotation drops the old one by value)
  jwt.sign({ _id: String(id), purpose }, secret() + extraSecret, { expiresIn, jwtid: crypto.randomUUID() });

function verify(token: unknown, purpose: Purpose, extraSecret = ''): string {
  try {
    const d = jwt.verify(String(token ?? ''), secret() + extraSecret) as { _id: string; purpose: string };
    if (d.purpose !== purpose) throw new Error();
    return d._id;
  } catch { throw new HttpError(401, 'invalid_token'); }
}

/** A reset token is signed with the current password hash too, so it stops working once the password changes. */
const resetSecret = (u: UserDoc) => u.password ?? '';

async function session(user: UserDoc) {
  const accessToken = sign(user._id, 'access', 24 * 3600);
  const refreshToken = sign(user._id, 'refresh', 60 * 24 * 3600);
  user.accessTokens = [...user.accessTokens, accessToken].slice(-SESSIONS);
  user.refreshTokens = [...user.refreshTokens, refreshToken].slice(-SESSIONS);
  await user.save();
  return { user, accessToken, refreshToken };
}

declare global { namespace Express { interface Request { user?: UserDoc; accessToken?: string } } }

/** Requires `Authorization: Bearer <access token>` of an active user (token still in the user's sessions). */
export const auth: RequestHandler = async (req, _res, next) => {
  const token = req.header('Authorization')?.replace(/^Bearer /, '');
  const id = verify(token, 'access');
  const user = await User.findOne({ _id: id, accessTokens: token }) as UserDoc | null;
  if (!user || !user.isActive) throw new HttpError(401, 'invalid_token');
  req.user = user; req.accessToken = token;
  next();
};

export function authRouter({ rateLimit = true } = {}) {
  const r = Router();
  const limit = limits(rateLimit);

  r.post('/auth/register', limit.mail, async (req, res) => {
    const mail = email(req.body);
    const workshop = req.body?.workshop === undefined ? undefined : str(req.body, 'workshop');
    // Name is optional (the design's sign-up asks for the workshop, not the person); the e-mail's first part stands in.
    const data = { name: typeof req.body?.name === 'string' && req.body.name.trim() ? str(req.body, 'name') : mail.split('@')[0], email: mail, password: password(req.body), pendingWorkshop: workshop };
    if (await User.exists({ email: data.email })) throw new HttpError(409, 'email_taken');
    const user = await User.create(data) as UserDoc;
    await verifyMail(user.email, user.name, sign(user._id, 'verify', 24 * 3600));
    res.status(201).send({ user }); // no session until the e-mail is confirmed
  });

  r.post('/auth/verify', async (req, res) => {
    const user = await User.findById(verify(req.body?.token, 'verify')) as UserDoc | null;
    if (!user || !user.isActive) throw new HttpError(401, 'invalid_token');
    if (user.verified) throw new HttpError(409, 'already_verified'); // the link signs in only once
    user.verified = true;
    if (user.pendingWorkshop) { await createWorkshop(user, user.pendingWorkshop); user.pendingWorkshop = undefined; }
    res.send(await session(user)); // the link proved the address: sign in at once
  });

  // Always 204: does not reveal whether the address has an account.
  r.post('/auth/verify/resend', limit.mail, async (req, res) => {
    const user = await User.findOne({ email: email(req.body) }) as UserDoc | null;
    if (user && !user.verified && user.isActive) await verifyMail(user.email, user.name, sign(user._id, 'verify', 24 * 3600));
    res.status(204).send();
  });

  r.post('/auth/login', limit.login, async (req, res) => {
    const user = await User.findOne({ email: email(req.body) }) as UserDoc | null;
    const ok = user?.isActive && await user.checkPassword(String(req.body?.password ?? ''));
    if (!user || !ok) throw new HttpError(401, 'wrong_login');
    if (!user.verified) throw new HttpError(403, 'not_verified');
    res.send(await session(user));
  });

  // Refresh rotation: the used refresh token is dropped, a new pair is issued.
  r.post('/auth/token', async (req, res) => {
    const token = String(req.body?.refreshToken ?? '');
    const user = await User.findOne({ _id: verify(token, 'refresh'), refreshTokens: token }) as UserDoc | null;
    if (!user || !user.isActive) throw new HttpError(401, 'invalid_token');
    user.refreshTokens = user.refreshTokens.filter(t => t !== token);
    const { accessToken, refreshToken } = await session(user);
    res.send({ accessToken, refreshToken });
  });

  r.get('/auth/me', auth, (req, res) => void res.send({ user: req.user }));

  r.post('/auth/logout', auth, async (req, res) => {
    const u = req.user!;
    u.accessTokens = u.accessTokens.filter(t => t !== req.accessToken);
    u.refreshTokens = u.refreshTokens.filter(t => t !== req.body?.refreshToken);
    await u.save();
    res.status(204).send();
  });

  r.post('/auth/password/change', auth, async (req, res) => {
    const u = req.user!;
    const next = password(req.body, 'newPassword');
    if (!await u.checkPassword(String(req.body?.oldPassword ?? ''))) throw new HttpError(400, 'wrong_password');
    u.password = next;
    u.accessTokens = u.accessTokens.filter(t => t === req.accessToken); // other devices are signed out
    u.refreshTokens = [];
    await u.save();
    res.status(204).send();
  });

  r.post('/auth/password/reset', limit.mail, async (req, res) => {
    const user = await User.findOne({ email: email(req.body) }) as UserDoc | null;
    if (user?.isActive) await resetMail(user.email, user.name, sign(user._id, 'reset', 30 * 60, resetSecret(user)));
    res.status(204).send();
  });

  r.post('/auth/password/reset/confirm', async (req, res) => {
    const token = String(req.body?.token ?? '');
    const next = password(req.body);
    const id = (jwt.decode(token) as { _id?: string } | null)?._id;
    const user = id && /^[a-f0-9]{24}$/.test(id) ? await User.findById(id) as UserDoc | null : null;
    if (!user) throw new HttpError(401, 'invalid_token');
    verify(token, 'reset', resetSecret(user));
    user.password = next;
    user.verified = true; // the link came to the mailbox
    user.accessTokens = []; user.refreshTokens = []; // a new password signs out every device
    await user.save();
    res.status(204).send();
  });

  r.use(googleRouter());
  return r;
}

// Google sign-in (OpenID Connect), as in arbyte-api: state in a cookie, the site gets a 60 s one-time code, not a token
// (the URL stays in browser history and logs). shortcut: the code can be exchanged more than once within its 60 s.
const GOOGLE = {
  authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  userInfoUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
};
const STATE = 'oauth_state';
const PATH = '/api/v1/auth/google';
const apiBase = () => process.env.URL || process.env.FRONTEND_BASE_URL || '';
const callbackUrl = () => `${apiBase()}${PATH}/callback`;
const back = (q: Record<string, string>) => `${process.env.FRONTEND_BASE_URL}/prijava?${new URLSearchParams(q)}`;
const cookie = (header: string | undefined, name: string) => (header ?? '').split(';').map(p => p.trim().split('=')).find(([k]) => k === name)?.[1];

function googleRouter() {
  const r = Router();
  const on = () => !!process.env.GOOGLE_CLIENT_ID;

  r.get('/auth/google', (req, res) => {
    if (!on()) return res.redirect(back({ error: 'google_off' }));
    const state = crypto.randomBytes(16).toString('hex');
    res.cookie(STATE, state, { httpOnly: true, sameSite: 'lax', secure: apiBase().startsWith('https:'), maxAge: 10 * 60_000, path: PATH });
    res.redirect(`${GOOGLE.authUrl}?${new URLSearchParams({ response_type: 'code', client_id: process.env.GOOGLE_CLIENT_ID!, redirect_uri: callbackUrl(), scope: 'openid email profile', state })}`);
  });

  r.get('/auth/google/callback', async (req, res) => {
    const state = cookie(req.headers.cookie, STATE);
    res.clearCookie(STATE, { path: PATH });
    if (!on() || req.query.error) return res.redirect(back({ error: 'google_cancelled' }));
    if (!state || state !== req.query.state || typeof req.query.code !== 'string') return res.redirect(back({ error: 'google_failed' }));
    try {
      const t = await fetch(GOOGLE.tokenUrl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'authorization_code', code: req.query.code, redirect_uri: callbackUrl(),
          client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '' }) });
      if (!t.ok) throw new Error(`token ${t.status}`);
      const { access_token } = await t.json() as { access_token: string };
      const p = await fetch(GOOGLE.userInfoUrl, { headers: { Authorization: `Bearer ${access_token}` } });
      if (!p.ok) throw new Error(`userinfo ${p.status}`);
      const profile = await p.json() as { email?: string; email_verified?: boolean | string; name?: string };
      if (!profile.email || String(profile.email_verified) === 'false') return res.redirect(back({ error: 'google_no_email' }));
      const mail = profile.email.toLowerCase();
      let user = await User.findOne({ email: mail }) as UserDoc | null;
      if (user && !user.isActive) return res.redirect(back({ error: 'google_failed' }));
      if (!user) user = await User.create({ email: mail, name: profile.name?.trim() || mail.split('@')[0], verified: true }) as UserDoc;
      else if (!user.verified) { user.verified = true; await user.save(); } // Google confirmed the address
      res.redirect(back({ code: sign(user._id, 'oauth', 60) }));
    } catch (e) {
      console.error('Google sign-in failed:', (e as Error).message);
      res.redirect(back({ error: 'google_failed' }));
    }
  });

  r.post('/auth/google/exchange', async (req, res) => {
    const user = await User.findById(verify(req.body?.code, 'oauth')) as UserDoc | null;
    if (!user || !user.isActive) throw new HttpError(401, 'invalid_token');
    res.send(await session(user));
  });
  return r;
}
