// One-time migration: reconcile MongoDB indexes with the current Mongoose
// schemas. The catalog migration changed Revision from `problemId` to
// `userProblemId`, but MongoDB keeps old indexes until told otherwise. The
// stale unique index `problemId_1_revisionLevel_1` makes every revision collide
// on `problemId: null`, breaking revision creation for the 2nd problem onward.
//
// syncIndexes() drops indexes not defined in the schema and builds missing ones.
//
// Usage: npm run sync:indexes
require('dotenv').config();

const mongoose = require('mongoose');
const User = require('../src/models/User');
const ProblemCatalog = require('../src/models/ProblemCatalog');
const UserProblem = require('../src/models/UserProblem');
const Revision = require('../src/models/Revision');

const models = { User, ProblemCatalog, UserProblem, Revision };

const run = async () => {
  if (!process.env.MONGO_URI) {
    console.error('Error: MONGO_URI is not defined in .env file');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 });
  console.log('MongoDB connected.\n');

  // Remove dead legacy revisions left over from the pre-catalog schema. They
  // have no userProblemId, so the current app can never read them, and their
  // null values collide on the new unique index. Valid revisions are untouched.
  const deadRevisions = await Revision.deleteMany({ userProblemId: null });
  if (deadRevisions.deletedCount) {
    console.log(`Removed ${deadRevisions.deletedCount} dead legacy revision(s).\n`);
  }

  console.log('Syncing indexes...\n');

  for (const [name, Model] of Object.entries(models)) {
    const before = (await Model.collection.indexes()).map((i) => i.name);
    const dropped = await Model.syncIndexes();
    const after = (await Model.collection.indexes()).map((i) => i.name);
    console.log(`${name}:`);
    console.log(`  before: ${before.join(', ')}`);
    console.log(`  after:  ${after.join(', ')}`);
    const removed = before.filter((i) => !after.includes(i));
    if (removed.length) console.log(`  dropped stale: ${removed.join(', ')}`);
    console.log('');
  }

  await mongoose.disconnect();
  console.log('Index sync complete.');
  process.exit(0);
};

run().catch(async (error) => {
  console.error(`Index sync failed: ${error.message}`);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
