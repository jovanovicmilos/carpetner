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

export const linkMail = (to: string, token: string) => send(to, 'Link za prijavu u Kroj',
  `Zdravo,\n\nprijavi se u Kroj klikom na link (važi 30 minuta, radi jednom):\n${front()}/prijava?link=${token}\n\nTvoje kuhinje su sačuvane u nalogu. Ako nisi tražio prijavu, zanemari ovu poruku.`);

export const resetMail = (to: string, name: string, token: string) => send(to, 'Nova lozinka za Kroj',
  `Zdravo ${name},\n\nnovu lozinku postavljaš na linku (važi 30 minuta):\n${front()}/prijava?lozinka=${token}\n\nAko nisi tražio novu lozinku, zanemari ovu poruku.`);

export const inviteMail = (to: string, workshop: string, hasAccount: boolean) => send(to, `Poziv u radionicu ${workshop} u Kroju`,
  hasAccount ? `Zdravo,\n\ndodat si u radionicu ${workshop}. Prijavi se svojim nalogom i radionica je u meniju:\n${front()}/prijava\n`
    : `Zdravo,\n\nradionica ${workshop} te poziva u Kroj. Napravi nalog sa ovom e-poštom i odmah si u radionici:\n${front()}/prijava?poziv=${encodeURIComponent(to)}&radionica=${encodeURIComponent(workshop)}\n\nAko ne očekuješ poziv, zanemari ovu poruku.`);
