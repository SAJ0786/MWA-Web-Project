// Run under `firebase emulators:exec --only firestore` (see docs/SETUP.md).
import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, doc, getDoc, setDoc, updateDoc, serverTimestamp, terminate } from 'firebase/firestore';

const host = process.env.FIRESTORE_EMULATOR_HOST;
const projectId = 'demo-mwa-islamic-events';

test('Islamic event rules: public read, admin editing, schema and revision enforcement', { skip: !host }, async () => {
  const [hostname, port] = host.split(':');
  const clients = [];
  function client(uid) {
    const app = initializeApp({ projectId, apiKey: 'fake-emulator-api-key' }, `rules-${uid || 'public'}`);
    const db = getFirestore(app);
    connectFirestoreEmulator(db, hostname, Number(port), uid ? { mockUserToken: { sub: uid, user_id: uid } } : {});
    clients.push({ app, db });
    return db;
  }
  const owner = async (path, fields) => {
    const response = await fetch(`http://${host}/v1/projects/${projectId}/databases/(default)/documents/${path}`, {
      method: 'PATCH', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields })
    });
    assert.equal(response.ok, true, await response.text());
  };
  await owner('users/rules-admin', { role: { stringValue: 'admin' } });
  const publicDb = client();
  const memberDb = client('rules-member');
  const adminDb = client('rules-admin');
  const makeData = uid => ({
    name: 'Test Eid', day: 1, month: 10, category: 'Eid', notes: '', enabled: true, priority: 5,
    revision: 0, updatedAt: serverTimestamp(), updatedBy: uid
  });
  try {
    await assert.rejects(setDoc(doc(publicDb, 'keyIslamicEvents/rules-test'), makeData('guest')), /permission/i);
    await assert.rejects(setDoc(doc(memberDb, 'keyIslamicEvents/rules-test'), makeData('rules-member')), /permission/i);
    await setDoc(doc(adminDb, 'keyIslamicEvents/rules-test'), makeData('rules-admin'));
    assert.equal((await getDoc(doc(publicDb, 'keyIslamicEvents/rules-test'))).data().name, 'Test Eid');
    const update = { day: 2, revision: 1, updatedBy: 'rules-admin', updatedAt: serverTimestamp() };
    await assert.rejects(updateDoc(doc(memberDb, 'keyIslamicEvents/rules-test'), update), /permission/i);
    for (const patch of [{ day: 31 }, { month: 13 }, { day: 1.5 }, { category: 'invalid' }, { name: ' ' }, { revision: 0 }, { updatedBy: 'spoof' }, { privateContact: 'not allowed' }]) {
      await assert.rejects(updateDoc(doc(adminDb, 'keyIslamicEvents/rules-test'), { ...update, ...patch }), /permission/i);
    }
    await updateDoc(doc(adminDb, 'keyIslamicEvents/rules-test'), update);
    const saved = (await getDoc(doc(publicDb, 'keyIslamicEvents/rules-test'))).data();
    assert.equal(saved.day, 2);
    assert.equal(saved.revision, 1);
    await assert.rejects(updateDoc(doc(adminDb, 'keyIslamicEvents/rules-test'), update), /permission/i);
  } finally {
    for (const { db, app } of clients) { await terminate(db); await deleteApp(app); }
  }
});
