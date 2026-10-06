// One-off data migration for databases created by older versions of EcoPulse:
//   - normalises phone numbers to +237XXXXXXXXX (and the community chat ids built from them)
//   - removes collector PINs left over from the old phone + PIN sign-in (collectors now use
//     email + password) and lists collectors who still need an email
//   - recomputes bin status from fill level (older seeds skipped the model hook)
//
//   node scripts/migrate.js           # dry run: prints what would change
//   node scripts/migrate.js --apply   # writes the changes
//
// Safe to run more than once.
//
// Uses MONGODB_URI from the environment / server/.env.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const { normalizePhone } = require('../utils/phone');
const Bin = require('../models/Bin');

const APPLY = process.argv.includes('--apply');
const COMMUNITY_PREFIX = 'community_';

async function normalizeField(db, collectionName, field, { unique = false } = {}) {
  const col = db.collection(collectionName);
  const docs = await col.find({ [field]: { $type: 'string' } }, { projection: { [field]: 1 } }).toArray();
  const seen = new Map();
  let changed = 0;
  for (const doc of docs) {
    const current = doc[field];
    const normalized = normalizePhone(current);
    if (!normalized) {
      console.warn(`  ! ${collectionName}.${field} "${current}" (${doc._id}) is not a readable phone number — left as is`);
      continue;
    }
    if (unique) {
      if (seen.has(normalized)) {
        console.warn(`  ! ${collectionName}: ${doc._id} and ${seen.get(normalized)} both become ${normalized} — skipped, resolve by hand`);
        continue;
      }
      seen.set(normalized, doc._id);
    }
    if (normalized !== current) {
      changed++;
      console.log(`  ${collectionName}.${field}: "${current}" -> "${normalized}"`);
      if (APPLY) await col.updateOne({ _id: doc._id }, { $set: { [field]: normalized } });
    }
  }
  return changed;
}

async function migrateCommunityChats(db) {
  const messages = db.collection('messages');
  const chatIds = await messages.distinct('chatId', { chatId: { $regex: `^${COMMUNITY_PREFIX}` } });
  let changed = 0;
  for (const chatId of chatIds) {
    const phone = normalizePhone(chatId.slice(COMMUNITY_PREFIX.length));
    if (!phone) continue;
    const newChatId = `${COMMUNITY_PREFIX}${phone}`;
    if (newChatId === chatId) continue;
    changed++;
    console.log(`  messages.chatId: "${chatId}" -> "${newChatId}"`);
    if (APPLY) {
      await messages.updateMany({ chatId }, { $set: { chatId: newChatId } });
      await messages.updateMany({ chatId: newChatId, senderRole: 'community' }, { $set: { sender: phone } });
    }
  }
  return changed;
}

async function retirePins(db) {
  const col = db.collection('collectors');
  const docs = await col.find({ pin: { $exists: true } }, { projection: { name: 1 } }).toArray();
  for (const doc of docs) console.log(`  collectors.pin: removing old PIN for ${doc.name} (${doc._id})`);
  if (APPLY && docs.length) await col.updateMany({ pin: { $exists: true } }, { $unset: { pin: '' } });
  return docs.length;
}

// Report only: collectors can't sign in until an admin adds their email in the dashboard
async function listCollectorsWithoutEmail(db) {
  const docs = await db.collection('collectors')
    .find({ $or: [{ email: { $exists: false } }, { email: null }, { email: '' }] }, { projection: { name: 1 } })
    .toArray();
  if (docs.length) {
    console.log(`\n  ! ${docs.length} collector(s) have no email and can't sign in yet — add one in the dashboard,`);
    console.log('    then use Reset password to give them a temporary password:');
    for (const doc of docs) console.log(`      - ${doc.name} (${doc._id})`);
  }
}

async function fixBinStatuses(db) {
  const col = db.collection('bins');
  const bins = await col.find({}, { projection: { binId: 1, fillLevel: 1, status: 1 } }).toArray();
  let changed = 0;
  for (const bin of bins) {
    const status = Bin.statusForFill(bin.fillLevel ?? 0);
    if (status === bin.status) continue;
    changed++;
    console.log(`  bins.status: ${bin.binId} (${bin.fillLevel}% full) "${bin.status}" -> "${status}"`);
    if (APPLY) await col.updateOne({ _id: bin._id }, { $set: { status } });
  }
  return changed;
}

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  console.log(`${APPLY ? 'APPLYING' : 'DRY RUN'} on ${db.databaseName}\n`);

  let total = 0;
  total += await normalizeField(db, 'collectors', 'phone', { unique: true });
  total += await normalizeField(db, 'communityusers', 'phone', { unique: true });
  total += await normalizeField(db, 'applications', 'phone');
  total += await normalizeField(db, 'reports', 'reporterPhone');
  total += await normalizeField(db, 'reports', 'deviceId'); // older app versions stored the phone here
  total += await migrateCommunityChats(db);
  total += await retirePins(db);
  total += await fixBinStatuses(db);
  await listCollectorsWithoutEmail(db);

  console.log(`\n${total} change(s) ${APPLY ? 'applied' : 'would be applied — rerun with --apply to write them'}`);
  await mongoose.disconnect();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
