import {httpsCallable} from 'firebase/functions';
import {auth,functions} from '../firebase/firebase.js';
export async function getAuditEntries(filters={}) {return (await httpsCallable(functions,'getAuditEntries')(filters)).data;}
export async function recordActivity(module,action,entityId='') {
 if(!auth.currentUser)return;
 try {await httpsCallable(functions,'recordActivity')({module,action,entityId});}
 catch(error){console.warn('Activity could not be recorded:',error.code||'unavailable');}
}
