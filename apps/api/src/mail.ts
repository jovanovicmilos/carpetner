// E-mails (Serbian, plain text). Without SMTP_HOST they are printed and kept in `outbox` (dev and tests).
import nodemailer from 'nodemailer';

export const outbox: { to: string; subject: string; text: string }[] = [];

const transport = () => process.env.SMTP_HOST ? nodemailer.createTransport({
  host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587),
  auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
}) : null;

/** Never throws: a failed e-mail must not fail the request (the user can ask for it again). */
export async function send(to: string, subject: string, text: string) {
  const t = transport();
  if (!t) { outbox.push({ to, subject, text }); if (process.env.NODE_ENV !== 'test') console.log(`[mail] ${to} · ${subject}\n${text}`); return; }
  try { await t.sendMail({ from: process.env.MAIL_FROM, to, subject, text }); }
  catch (e) { console.error('mail failed', to, subject, (e as Error).message); }
}

const front = () => process.env.FRONTEND_BASE_URL ?? '';

export const verifyMail = (to: string, name: string, token: string) => send(to, 'Potvrdi e-poštu za Kroj',
  `Zdravo ${name},\n\npotvrdi e-poštu klikom na link (važi 24 sata):\n${front()}/prijava?potvrda=${token}\n\nAko nisi pravio nalog u Kroju, zanemari ovu poruku.`);

export const resetMail = (to: string, name: string, token: string) => send(to, 'Nova lozinka za Kroj',
  `Zdravo ${name},\n\nnovu lozinku postavljaš na linku (važi 30 minuta):\n${front()}/prijava?lozinka=${token}\n\nAko nisi tražio novu lozinku, zanemari ovu poruku.`);
