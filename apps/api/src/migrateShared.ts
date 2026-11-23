// One-off, safe to run again: requests taken before the shared session (2026-11-23) point the workshop at its own copy of
// the kitchen. This points them at the customer's kitchen (both edit it) and keeps the old copy as a plain workshop
// project named "… (stara kopija)", so nothing is lost.
// Run: cd apps/api && npx tsx --env-file=.env src/migrateShared.ts
import mongoose from 'mongoose';
import { ProjectModel, RequestModel } from './models';

await mongoose.connect(process.env.MONGO_URL!);
const old = await RequestModel.find({ workshopProjectId: { $exists: true }, $expr: { $ne: ['$workshopProjectId', '$projectId'] } });
for (const r of old) {
  const copy = await ProjectModel.findById(r.workshopProjectId);
  if (copy && !copy.name.endsWith('(stara kopija)')) {
    copy.name += ' (stara kopija)';
    copy.data = { ...copy.data, name: copy.name }; // the app shows the project's own name
    await copy.save();
  }
  r.workshopProjectId = r.projectId;
  await r.save();
  console.log(`request ${r.id}: shared kitchen ${r.projectId}`);
}
console.log(`${old.length} request(s) moved to the shared kitchen`);
await mongoose.disconnect();
