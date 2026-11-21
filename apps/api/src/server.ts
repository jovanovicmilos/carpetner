import mongoose from 'mongoose';
import { createApp } from './app';

if (!process.env.SECRET || process.env.SECRET === 'change-me') throw new Error('Set SECRET in apps/api/.env (see .env.example)');
await mongoose.connect(process.env.MONGO_URL ?? 'mongodb://127.0.0.1:27017/kroj');
const port = Number(process.env.PORT ?? 3100);
// RATE_LIMIT=off only for local end-to-end runs (several sign-ups from one address in a minute).
createApp({ rateLimit: process.env.RATE_LIMIT !== 'off' }).listen(port, () => console.log(`Kroj API on http://localhost:${port}/api/v1`));
