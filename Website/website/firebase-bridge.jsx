import React from 'react';
import {createRoot} from 'react-dom/client';
import {onAuthStateChanged} from 'firebase/auth';
import {doc,onSnapshot} from 'firebase/firestore';
import {auth,db} from '@calendar/firebase/firebase.js';
import {AuthProvider,useAuth} from '@calendar/contexts/AuthContext.jsx';
import AdminLoginCard from './AdminLoginCard.jsx';
import {schemes,defaults,applyAppearance,normaliseSettings} from '../shared/appearance.js';
import './firebase-website.css';

window.MWA_SCHEMES=schemes;
let siteSettings=defaults;applyAppearance(siteSettings);
let resolveAuth;const authReady=new Promise(resolve=>{resolveAuth=resolve});let initial=true;
onAuthStateChanged(auth,()=>{if(initial){initial=false;resolveAuth();window.MWA_BRIDGE_RESOLVE()}else window.dispatchEvent(new Event('mwa-auth-changed'))});
window.mwaContentFetch=async(input,options={})=>{await authReady;const headers=new Headers(options.headers||{});if(auth.currentUser)headers.set('Authorization','Bearer '+await auth.currentUser.getIdToken());return fetch(input,{...options,headers})};
onSnapshot(doc(db,'calendarSettings','websiteAppearance'),snapshot=>{if(snapshot.exists()){siteSettings=normaliseSettings(snapshot.data());applyAppearance(siteSettings);window.dispatchEvent(new Event('mwa-site-settings-updated'))}},()=>{});
const refreshAppearance=()=>applyAppearance(siteSettings);
window.addEventListener('storage',refreshAppearance);window.addEventListener('mwa-appearance-preferences',refreshAppearance);matchMedia('(prefers-color-scheme: dark)').addEventListener('change',refreshAppearance);

const safeDestination=value=>value==='/cms'?'/cms':'/calendar/?view=admin';
function AdminLogin(){const session=useAuth();const destination=safeDestination(new URLSearchParams(location.search).get('returnTo'));if(session.loading)return <div className="admin-welcome"><p>Checking your admin session…</p></div>;if(session.isAdmin)return <section className="admin-welcome"><div className="eyebrow">MWA · ADMIN WORKSPACE</div><h1>Welcome back.</h1><p>Signed in as {session.user?.email}. Your calendar admin access is ready.</p><div className="admin-workspaces"><a className="btn" href={destination}>{destination==='/cms'?'Open website CMS':'Open calendar admin'} ↗</a><a className="btn alt" href={destination==='/cms'?'/calendar/?view=admin':'/cms'}>{destination==='/cms'?'Calendar admin':'Website CMS'} ↗</a><a className="text-link" href="/calendar/">View public calendar →</a></div><button type="button" className="admin-signout" onClick={session.logout}>Sign out</button></section>;return <div className="mwa-admin-auth"><div className="admin-auth-intro"><div className="eyebrow">ONE MWA · ONE ADMIN ACCOUNT</div><h1>Admin login.</h1><p>Use your existing MWA calendar admin account. After signing in, open the calendar workspace or manage website content.</p></div><AdminLoginCard {...session}/></div>}
if(location.pathname.replace(/\/$/,'')==='/admin-login'){
 document.querySelector('#main').hidden=true;document.querySelector('.skip')?.setAttribute('href','#admin-main');document.querySelector('#admin-main').hidden=false;
 createRoot(document.querySelector('#admin-root')).render(<AuthProvider><AdminLogin/></AuthProvider>);
}
if(location.pathname.replace(/\/$/,'')==='/member-login')window.MWA_BRIDGE_READY.then(()=>{document.querySelector('[data-action="login"]').click()});
