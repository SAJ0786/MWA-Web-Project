import {useEffect,useState} from 'react';
import {doc,onSnapshot} from 'firebase/firestore';
import {db,firebaseConfigured} from '../firebase/firebase';
import {applyAppearance,readPreferences,normaliseSettings,defaults} from '@mwa/appearance';

// The website header owns the only Appearance panel. This frame only follows it.
export default function AppearanceSync({onBrandChange}) {
 const [settings,setSettings]=useState(defaults);
 useEffect(()=>{
  if(!firebaseConfigured)return;
  return onSnapshot(doc(db,'calendarSettings','websiteAppearance'),snapshot=>setSettings(normaliseSettings(snapshot.exists()?snapshot.data():defaults)),()=>setSettings(defaults));
 },[]);
 useEffect(()=>{
  const refresh=()=>applyAppearance(settings,readPreferences(),true);
  const media=matchMedia('(prefers-color-scheme: dark)');
  refresh();
  media.addEventListener('change',refresh);
  window.addEventListener('storage',refresh);
  window.addEventListener('mwa-appearance-preferences',refresh);
  return()=>{media.removeEventListener('change',refresh);window.removeEventListener('storage',refresh);window.removeEventListener('mwa-appearance-preferences',refresh)};
 },[settings]);
 useEffect(()=>{onBrandChange?.(settings.logo)},[settings.logo,onBrandChange]);
 return null;
}
