// One-time, create-only migration. Uses ADC or the Firestore emulator; never overwrites admin edits.
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const requireFunctions = createRequire(path.join(__dirname, '..', 'functions', 'package.json'));
const { initializeApp, applicationDefault } = requireFunctions('firebase-admin/app');
const { getFirestore, FieldValue } = requireFunctions('firebase-admin/firestore');

async function main() {
  const projectId = process.argv[2];
  if (!projectId || !/^[a-z][a-z0-9-]+$/.test(projectId)) {
    throw new Error('Usage: node scripts\\seed-islamic-events.cjs <explicit-firebase-project-id>');
  }
  initializeApp({
    projectId,
    ...(process.env.FIRESTORE_EMULATOR_HOST ? {} : { credential: applicationDefault() })
  });
  const db = getFirestore();
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, 'key-islamic-events.seed.json'), 'utf8'));
  const { validateIslamicEvent } = await import('../src/utils/islamicEvents.js');
  if (new Set(events.map(event => event.id)).size !== events.length) throw new Error('Seed data contains duplicate IDs.');
  events.forEach(validateIslamicEvent);
  let created = 0;
  for (const { id, ...event } of events) {
    const added = await db.runTransaction(async transaction => {
      const ref = db.collection('keyIslamicEvents').doc(id);
      if ((await transaction.get(ref)).exists) return false;
      transaction.create(ref, {
        ...event, revision: 0, updatedAt: FieldValue.serverTimestamp(), updatedBy: 'community-observances-migration'
      });
      return true;
    });
    if (added) created++;
  }
  console.log(`Created ${created} observances; preserved ${events.length - created} existing records in ${projectId}.`);
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
