import {collection,onSnapshot} from 'firebase/firestore';
import {httpsCallable} from 'firebase/functions';
import {db,functions} from '../firebase/firebase.js';
import {validateIslamicEvent} from '../utils/islamicEvents.js';
export function watchIslamicEvents(onData,onError){return onSnapshot(collection(db,'keyIslamicEvents'),snapshot=>onData(snapshot.docs.map(item=>({...item.data(),id:item.id}))),onError);}
export async function createIslamicEvent(event){validateIslamicEvent(event);return (await httpsCallable(functions,'changeIslamicEvent')({data:event})).data;}
export async function saveIslamicEvent(original,changes){validateIslamicEvent(changes);return (await httpsCallable(functions,'changeIslamicEvent')({id:original.id,revision:original.revision,data:changes})).data;}
