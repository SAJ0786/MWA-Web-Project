/**
 * Turn a selection of bookings plus a chosen series scope into the minimal list of deleteBooking calls.
 * Non-series bookings are always deleted singly. For 'all', one call per series; for 'future', one call per
 * series anchored at its earliest selected occurrence. `covers(booking, nowIso)` reports which loaded bookings
 * the call will remove (upcoming occurrences only; started ones are kept server-side).
 */
export function planSeriesDeletes(items, scope = 'single') {
  const plans = [];
  const bySeries = new Map();
  for (const item of items) {
    if (!item.seriesId || scope === 'single') {
      plans.push({ anchor: item, scope: 'single', covers: e => e.id === item.id });
      continue;
    }
    const current = bySeries.get(item.seriesId);
    if (!current || item.startAt < current.startAt) bySeries.set(item.seriesId, item);
  }
  for (const anchor of bySeries.values()) {
    const covers = (e, nowIso) => e.seriesId === anchor.seriesId &&
      (!nowIso || e.startAt > nowIso) &&
      (scope === 'all' || e.startAt >= anchor.startAt || e.id === anchor.id);
    plans.push({ anchor, scope, covers });
  }
  return plans;
}
