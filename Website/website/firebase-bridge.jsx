import React,{useState} from 'react';
import {createPortal} from 'react-dom';
import {createRoot} from 'react-dom/client';
import {onAuthStateChanged} from 'firebase/auth';
import {doc,onSnapshot} from 'firebase/firestore';
import {auth,db} from '@calendar/firebase/firebase.js';
import {AuthProvider,useAuth} from '@calendar/contexts/AuthContext.jsx';
import AdminLoginCard from './AdminLoginCard.jsx';
import AdminConsole from './AdminConsole.jsx';
import {schemes,defaults,applyAppearance,normaliseSettings} from '../shared/appearance.js';
import './firebase-website.css';
import './solar-panel.js';
import {mountCalendarShell} from './calendar-shell.js';

window.MWA_SCHEMES=schemes;
let siteSettings=defaults;applyAppearance(siteSettings);
let resolveAuth;const authReady=new Promise(resolve=>{resolveAuth=resolve});let initial=true;
onAuthStateChanged(auth,()=>{if(initial){initial=false;resolveAuth();window.MWA_BRIDGE_RESOLVE()}else window.dispatchEvent(new Event('mwa-auth-changed'))});
window.mwaContentFetch=async(input,options={})=>{await authReady;const headers=new Headers(options.headers||{});if(auth.currentUser)headers.set('Authorization','Bearer '+await auth.currentUser.getIdToken());return fetch(input,{...options,headers})};
onSnapshot(doc(db,'calendarSettings','websiteAppearance'),snapshot=>{if(snapshot.exists()){siteSettings=normaliseSettings(snapshot.data());applyAppearance(siteSettings);window.dispatchEvent(new Event('mwa-site-settings-updated'))}},()=>{});
const refreshAppearance=()=>applyAppearance(siteSettings);
window.addEventListener('storage',refreshAppearance);window.addEventListener('mwa-appearance-preferences',refreshAppearance);matchMedia('(prefers-color-scheme: dark)').addEventListener('change',refreshAppearance);

function AdminLogin(){const session=useAuth();if(session.loading)return <div className="admin-welcome"><p>Checking your admin session…</p></div>;if(session.isAdmin)return <AdminConsole email={session.user?.email}/>;return <div className="mwa-admin-auth"><div className="admin-auth-intro"><div className="eyebrow">ONE MWA · ONE ADMIN ACCOUNT</div><h1>Admin login.</h1><p>Use your existing MWA calendar admin account. After signing in, open the calendar workspace or manage website content.</p></div><AdminLoginCard {...session}/></div>}
if(location.pathname.replace(/\/$/,'')==='/admin-login'){
 document.querySelector('#main').hidden=true;document.querySelector('.skip')?.setAttribute('href','#admin-main');document.querySelector('#admin-main').hidden=false;

}
if(location.pathname.replace(/\/$/,'')==='/member-login')window.MWA_BRIDGE_READY.then(()=>{document.querySelector('[data-action="login"]').click()});

function WebsiteSession(){
 const session=useAuth();const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 async function signOut(){setBusy(true);setError('');try{await session.logout()}catch{setError('Could not sign out. Please try again.')}finally{setBusy(false)}}
 return <>{session.isAdmin?<button className="btn alt small admin-header" type="button" disabled={busy} aria-busy={busy} onClick={signOut}>Admin Sign out</button>:<a className="btn alt small admin-header" href="/admin-login">Admin Login</a>}{session.isAdmin&&createPortal(<a className="nav-admin-console" href="/admin-login" aria-current={location.pathname==='/admin-login'?'page':undefined}>Admin Console</a>,document.querySelector('#nav'))}{error&&<span role="alert" className="admin-header-error">{error}</span>}{location.pathname.replace(/\/$/,'')==='/admin-login'&&createPortal(<AdminLogin/>,document.querySelector('#admin-root'))}</>;
}
const adminHeader=document.querySelector('.admin-header');
const sessionRoot=document.createElement('span');sessionRoot.className='admin-header-slot';
adminHeader.replaceWith(sessionRoot);
createRoot(sessionRoot).render(<AuthProvider><WebsiteSession/></AuthProvider>);
mountCalendarShell();
