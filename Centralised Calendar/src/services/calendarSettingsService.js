import {doc,getDoc,onSnapshot} from 'firebase/firestore';
import {httpsCallable} from 'firebase/functions';
import {db,functions} from '../firebase/firebase.js';
export const DEFAULT_HIJRI_SETTINGS={overrides:[],adjustmentDays:0};
const settings=snap=>snap.exists()?{overrides:snap.data().overrides||[],adjustmentDays:snap.data().adjustmentDays??0}:{...DEFAULT_HIJRI_SETTINGS};
export async function getHijriSettings(){return settings(await getDoc(doc(db,'calendarSettings','hijri')));}
export function watchHijriSettings(onData,onError){return onSnapshot(doc(db,'calendarSettings','hijri'),snap=>onData(settings(snap)),onError);}
export async function saveMonthOverride(hYear,hMonth,gDate){return (await httpsCallable(functions,'changeHijriMonth')({hYear:Number(hYear),hMonth:Number(hMonth),gDate})).data.overrides;}
export async function removeMonthOverride(hYear,hMonth){return (await httpsCallable(functions,'changeHijriMonth')({hYear:Number(hYear),hMonth:Number(hMonth),remove:true})).data.overrides;}
