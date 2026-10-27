export const EMPTY_BOOKING_FILTERS = Object.freeze({ from: '', to: '', departmentId: '', venueId: '', status: '', search: '' });

/** Apply the Bookings page filters. Masked (private, public-view) bookings never match a booking-type filter or a search on hidden fields. */
export function filterBookings(events, filters, dateKey) {
  const f = { ...EMPTY_BOOKING_FILTERS, ...filters };
  const q = f.search.trim().toLowerCase();
  return events.filter(e => {
    const k = dateKey(e.startAt);
    if (f.from && k < f.from) return false;
    if (f.to && k > f.to) return false;
    if (f.departmentId && (e.masked || e.departmentId !== f.departmentId)) return false;
    if (f.venueId && e.venueId !== f.venueId) return false;
    if (f.status && e.status !== f.status) return false;
    if (q) {
      const fields = e.masked ? [e.title] : [e.title, e.contactName, e.organiser, e.departmentName, e.venueName];
      if (!fields.some(v => typeof v === 'string' && v.toLowerCase().includes(q))) return false;
    }
    return true;
  });
}

export function activeFilterCount(filters) {
  return Object.keys(EMPTY_BOOKING_FILTERS).filter(k => (filters[k] || '').toString().trim() !== '').length;
}

/** Human summary of active filters, e.g. "From 2026-01-01 · Main Hall · confirmed". */
export function describeFilters(filters, { venues = [], departments = [] } = {}) {
  const parts = [];
  if (filters.from) parts.push(`From ${filters.from}`);
  if (filters.to) parts.push(`To ${filters.to}`);
  if (filters.departmentId) parts.push(departments.find(d => d.id === filters.departmentId)?.name || filters.departmentId);
  if (filters.venueId) parts.push(venues.find(v => v.id === filters.venueId)?.name || filters.venueId);
  if (filters.status) parts.push(filters.status);
  if (filters.search && filters.search.trim()) parts.push(`“${filters.search.trim()}”`);
  return parts.join(' · ');
}
