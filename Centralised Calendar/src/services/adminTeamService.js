// Admin team (allowlist) service. Reads are live from Firestore (admin-only by rules);
// every change goes through Cloud Functions so it is validated and audited server-side.
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase/firebase';

export async function syncAdminAccess() {
  const res = await httpsCallable(functions, 'syncAdminAccess')({});
  return res.data;
}

export function watchAdminTeam(callback, onError) {
  const q = query(collection(db, 'adminAllowlist'), orderBy('email'));
  return onSnapshot(q, (snap) => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))), onError);
}

export async function addAdminEmail(email) {
  const res = await httpsCallable(functions, 'addAdminEmail')({ email });
  return res.data;
}

export async function removeAdminEmail(email) {
  const res = await httpsCallable(functions, 'removeAdminEmail')({ email });
  return res.data;
}
