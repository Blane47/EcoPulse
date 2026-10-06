// One-off migration for databases created before phone normalisation and PIN hashing.
//
//   node scripts/migrate-phones-and-pins.js           # dry run: prints what would change
//   node scripts/migrate-phones-and-pins.js --apply   # writes the changes
//
// Uses MONGODB_URI from the environment / server/.env.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { normalizePhone } = require('../utils/phone');

const APPLY = process.argv.includes('--apply');
const BCRYPT_HASH = /^\$2[aby]\$\d{2}\$/;
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

async function hashPins(db) {
  const col = db.collection('collectors');
  const docs = await col.find({ pin: { $type: 'string' } }, { projection: { pin: 1, name: 1 } }).toArray();
  let changed = 0;
  for (const doc of docs) {
    if (BCRYPT_HASH.test(doc.pin)) continue;
    changed++;
    console.log(`  collectors.pin: hashing PIN for ${doc.name} (${doc._id})`);
    if (APPLY) await col.updateOne({ _id: doc._id }, { $set: { pin: await bcrypt.hash(doc.pin, 10) } });
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
  total += await hashPins(db);

  console.log(`\n${total} change(s) ${APPLY ? 'applied' : 'would be applied — rerun with --apply to write them'}`);
  await mongoose.disconnect();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
