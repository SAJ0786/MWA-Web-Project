import catalog from '../functions/adminModules.json';
export const ADMIN_MODULES=catalog.modules;
export const OWNER_EMAIL='admin@muhammadiwelfare.org.au';
export function effectiveModules(entry){if(!entry)return [];if(!Object.hasOwn(entry,'modules'))return [...catalog.legacyModules];return Array.isArray(entry.modules)?entry.modules.filter(id=>ADMIN_MODULES.some(m=>m.id===id)):[];}
export function accessActive(entry,now=Date.now()){if(entry?.accessExpiresAt==null)return true;const v=entry.accessExpiresAt;const until=typeof v.toMillis==='function'?v.toMillis():new Date(v).getTime();return Number.isFinite(until)&&now<until;}
export function permittedModules(email,entry,isAdmin){return !isAdmin?[]:email?.toLowerCase()===OWNER_EMAIL?ADMIN_MODULES.map(m=>m.id):accessActive(entry)?effectiveModules(entry):[];}
