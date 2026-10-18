import { addDoc, collection, doc, onSnapshot, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/firebase.js';
import { validateIslamicEvent } from '../utils/islamicEvents.js';

export function watchIslamicEvents(onData, onError) {
  return onSnapshot(collection(db, 'keyIslamicEvents'), snapshot => {
    onData(snapshot.docs.map(item => ({ ...item.data(), id: item.id })));
  }, onError);
}

export async function createIslamicEvent(event, uid) {
  validateIslamicEvent(event);
  return addDoc(collection(db, 'keyIslamicEvents'), {
    name: event.name.trim(), day: event.day, month: event.month, category: event.category,
    notes: '', enabled: true, priority: 50, revision: 0,
    updatedAt: serverTimestamp(), updatedBy: uid
  });
}

export async function saveIslamicEvent(original, changes, uid) {
  validateIslamicEvent(changes);
  const ref = doc(db, 'keyIslamicEvents', original.id);
  await runTransaction(db, async transaction => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) throw new Error('This event no longer exists. Reload the list.');
    if (snapshot.data().revision !== original.revision) {
      throw new Error('Another admin changed this event. Cancel and reopen it to use the latest version.');
    }
    transaction.update(ref, {
      name: changes.name.trim(), day: changes.day, month: changes.month, category: changes.category,
      revision: original.revision + 1, updatedAt: serverTimestamp(), updatedBy: uid
    });
  });
}
