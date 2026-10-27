export function publicProgrammes(events) {
  return events.filter(event=>!event.masked && event.status==='confirmed' && String(event.departmentName||'').trim().toLowerCase()==='mwa programs')
    .sort((a,b)=>a.startAt.localeCompare(b.startAt));
}
