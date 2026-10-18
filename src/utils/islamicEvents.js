import { getHijriMonthLength, hijriToGregorian } from '../services/hijriService.js';

export const ISLAMIC_EVENT_CATEGORIES = ['Wiladat', 'Shahadat', 'Wafat', 'Eid', 'Ayyam-e-Aza', 'Amaal', 'Season', 'Event'];

export function observanceTone(category) {
  if (['Wiladat', 'Eid'].includes(category)) return 'happy';
  if (['Shahadat', 'Wafat', 'Ayyam-e-Aza'].includes(category)) return 'sad';
  return 'occasion';
}

export function validateIslamicEvent(event) {
  if (typeof event.name !== 'string' || !event.name.trim() || event.name.trim().length > 240) {
    throw new Error('Enter an event title between 1 and 240 characters.');
  }
  if (!Number.isInteger(event.month) || event.month < 1 || event.month > 12 ||
      !Number.isInteger(event.day) || event.day < 1 || event.day > 30) {
    throw new Error('Enter a Hijri month from 1 to 12 and a day from 1 to 30.');
  }
  if (!ISLAMIC_EVENT_CATEGORIES.includes(event.category)) throw new Error('Choose a valid event category.');
}

export function eventGregorianDate(event, year, overrides = []) {
  validateIslamicEvent(event);
  if (event.day > getHijriMonthLength(year, event.month, overrides)) return null;
  return hijriToGregorian(event.day, event.month, year, overrides);
}

export function eventsForHijriYear(events, year, overrides = []) {
  return events.filter(e => e.enabled !== false).map(e => ({
    ...e, gregorianDate: eventGregorianDate(e, year, overrides)
  })).sort((a, b) => a.month - b.month || a.day - b.day ||
    (a.priority ?? 50) - (b.priority ?? 50) || a.name.localeCompare(b.name));
}

export function filterIslamicEvents(events, month = null) {
  return month === null ? events : events.filter(event => event.month === month);
}

export function formatObservanceDate(key) {
  if (!key) return 'Not in this Hijri month (29 days)';
  return new Intl.DateTimeFormat('en-AU', {
    timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
  }).format(new Date(`${key}T12:00:00Z`));
}
