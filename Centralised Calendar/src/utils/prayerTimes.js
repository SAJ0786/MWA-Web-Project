// Prayer-time ("variable time") support for MWA Programs bookings.
// The astronomical calculation is ported unchanged from the Community Connect app
// (src/services/prayerTimeService.js, Jafari method: Fajr 16°, Maghrib 4°, Isha 14°)
// and kept in lockstep with the server copy in functions/prayerTimes.js.
// Every booking is held at Muhammadi Welfare Association, so the location is fixed.

export const MWA_LOCATION = {
  fullAddress: '81-89 Clifton Avenue, Kemps Creek NSW 2178',
  latitude: -33.8738,
  longitude: 150.7890,
  timeZone: 'Australia/Sydney'
};

export const PRAYER_OPTIONS = [
  { key: 'fajr', label: 'Fajr' },
  { key: 'zohrain', label: 'Zohrain' },
  { key: 'asr', label: 'Asr' },
  { key: 'maghreb', label: 'Maghreb' },
  { key: 'isha', label: 'Isha' }
];
export const PRAYER_KEYS = PRAYER_OPTIONS.map(o => o.key);
export const MAX_OFFSET_MINUTES = 360;

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const fixAngle = (v) => ((v % 360) + 360) % 360;
const fixHour = (v) => ((v % 24) + 24) % 24;
const pad2 = (n) => String(n).padStart(2, '0');

function dateToJulian(year, month, day) {
  if (month <= 2) { year -= 1; month += 12; }
  const a = Math.floor(year / 100);
  const b = 2 - a + Math.floor(a / 4);
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + b - 1524.5;
}

function sunPosition(jd) {
  const d = jd - 2451545.0;
  const g = fixAngle(357.529 + 0.98560028 * d) * DEG_TO_RAD;
  const q = fixAngle(280.459 + 0.98564736 * d);
  const l = fixAngle(q + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * DEG_TO_RAD;
  const e = (23.439 - 0.00000036 * d) * DEG_TO_RAD;
  const ra = Math.atan2(Math.cos(e) * Math.sin(l), Math.cos(l)) * RAD_TO_DEG / 15;
  return { declination: Math.asin(Math.sin(e) * Math.sin(l)) * RAD_TO_DEG, equation: q / 15 - fixHour(ra) };
}

function hourAngle(angle, latitude, declination) {
  const lat = latitude * DEG_TO_RAD;
  const dec = declination * DEG_TO_RAD;
  const value = (-Math.sin(angle * DEG_TO_RAD) - Math.sin(lat) * Math.sin(dec)) / (Math.cos(lat) * Math.cos(dec));
  return Math.acos(Math.max(-1, Math.min(1, value))) * RAD_TO_DEG / 15;
}

function asrTime(factor, latitude, declination) {
  const angle = -Math.atan(1 / (factor + Math.tan(Math.abs(latitude - declination) * DEG_TO_RAD))) * RAD_TO_DEG;
  return hourAngle(angle, latitude, declination);
}

function timeZoneOffsetHours(dateStr, timeZone) {
  const date = new Date(`${dateStr}T12:00:00Z`);
  if (!Number.isFinite(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-GB-u-ca-gregory-nu-latn', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
  }).formatToParts(date);
  const v = Object.fromEntries(parts.filter(p => p.type !== 'literal').map(p => [p.type, Number(p.value)]));
  return (Date.UTC(v.year, v.month - 1, v.day, v.hour % 24, v.minute, v.second) - date.getTime()) / 3600000;
}

function decimalToTime(value) {
  const fixed = fixHour(value + 0.5 / 60);
  const h = Math.floor(fixed);
  return `${pad2(h)}:${pad2(Math.floor((fixed - h) * 60))}`;
}

/** Prayer times ('HH:MM', Sydney wall clock) at the MWA centre for a civil date 'YYYY-MM-DD'. */
export function calculatePrayerTimes(dateStr, loc = MWA_LOCATION) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateStr || ''))) return null;
  const [year, month, day] = dateStr.split('-').map(Number);
  const offset = timeZoneOffsetHours(dateStr, loc.timeZone);
  if (offset === null) return null;
  const sun = sunPosition(dateToJulian(year, month, day) - loc.longitude / (15 * 24));
  const noon = fixHour(12 + offset - loc.longitude / 15 - sun.equation);
  const sunset = noon + hourAngle(0.833, loc.latitude, sun.declination);
  const maghreb = noon + hourAngle(4, loc.latitude, sun.declination);
  return {
    method: 'Jafari',
    timeZone: loc.timeZone,
    fajr: decimalToTime(noon - hourAngle(16, loc.latitude, sun.declination)),
    sunrise: decimalToTime(noon - hourAngle(0.833, loc.latitude, sun.declination)),
    sunset: decimalToTime(sunset),
    zohrain: decimalToTime(noon),
    asr: decimalToTime(noon + asrTime(1, loc.latitude, sun.declination)),
    maghreb: decimalToTime(Math.max(maghreb, sunset + 7 / 60)),
    isha: decimalToTime(noon + hourAngle(14, loc.latitude, sun.declination))
  };
}

export function prayerLabel(key) {
  return (PRAYER_OPTIONS.find(o => o.key === key) || {}).label || '';
}

export function applyPrayerOffset(time, offsetMinutes = 0) {
  if (!/^\d{2}:\d{2}$/.test(String(time || ''))) return time || '';
  const [h, m] = time.split(':').map(Number);
  const total = ((h * 60 + m + Number(offsetMinutes || 0)) % 1440 + 1440) % 1440;
  return `${pad2(Math.floor(total / 60))}:${pad2(total % 60)}`;
}

/** Accepts {key, offset} (or a bare key string); returns a normalised value or null. */
export function sanitizePrayer(value) {
  if (!value) return null;
  const key = typeof value === 'string' ? value : value.key;
  const k = String(key || '').trim().toLowerCase();
  const match = PRAYER_OPTIONS.find(o => o.key === k || o.label.toLowerCase() === k);
  if (!match) return null;
  const raw = typeof value === 'object' ? Number(value.offset || 0) : 0;
  const offset = Number.isFinite(raw) ? Math.max(-MAX_OFFSET_MINUTES, Math.min(MAX_OFFSET_MINUTES, Math.round(raw))) : 0;
  return { key: match.key, offset };
}

/** 'HH:MM' for a prayer (+offset) on a civil date, or null. */
export function prayerTimeOn(dateStr, prayer) {
  const p = sanitizePrayer(prayer);
  const times = p && calculatePrayerTimes(dateStr);
  return times ? applyPrayerOffset(times[p.key], p.offset) : null;
}

export function nextDayKey(dateKey) {
  return new Date(Date.parse(`${dateKey}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);
}

/**
 * Resolve the wall-clock start/end for a booking on `dateStr` where either end may follow a prayer.
 * Returns { start, end, endNextDay } or null when no prayer is involved / it can't be resolved.
 * With a prayer on either side, an end that is not after the start means the booking ends next day.
 */
export function resolvePrayerSchedule(dateStr, { start, end, startPrayer, endPrayer }) {
  const sp = sanitizePrayer(startPrayer);
  const ep = sanitizePrayer(endPrayer);
  if (!sp && !ep) return null;
  const s = sp ? prayerTimeOn(dateStr, sp) : start;
  let e = ep ? prayerTimeOn(dateStr, ep) : end;
  if (!s || !e) return null;
  const endNextDay = e <= s;
  if (endNextDay && ep) e = prayerTimeOn(nextDayKey(dateStr), ep);
  return { start: s, end: e, endNextDay };
}
