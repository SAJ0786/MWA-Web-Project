const test = require('node:test');
const assert = require('node:assert');
const { calculatePrayerTimes, sanitizePrayer, resolvePrayerSchedule, resolvePrayerInstants } = require('./prayerTimes');
const { validateImportRows } = require('./bookingImport');
const { resolveBookingDates } = require('./hijriRecompute');

test('prayer times for the MWA centre follow the seasons (Sydney wall clock)', () => {
  const winter = calculatePrayerTimes('2026-06-21');
  const summer = calculatePrayerTimes('2026-12-21');
  assert.equal(winter.method, 'Jafari');
  assert.ok(winter.maghreb > '16:30' && winter.maghreb < '17:45', winter.maghreb);
  assert.ok(summer.maghreb > '19:45' && summer.maghreb < '20:45', summer.maghreb);
  assert.ok(summer.fajr < winter.fajr);
  assert.equal(calculatePrayerTimes('bad'), null);
});

test('sanitizePrayer accepts keys/labels and clamps offsets', () => {
  assert.deepEqual(sanitizePrayer('Maghreb'), { key: 'maghreb', offset: 0 });
  assert.deepEqual(sanitizePrayer({ key: 'isha', offset: 999 }), { key: 'isha', offset: 360 });
  assert.equal(sanitizePrayer({ key: 'dhuhr' }), null);
  assert.equal(sanitizePrayer(null), null);
});

test('prayer schedule: offset, fixed end, and overnight prayer end', () => {
  const t = calculatePrayerTimes('2026-06-21');
  const a = resolvePrayerSchedule('2026-06-21', { start: '', end: '21:00', startPrayer: { key: 'maghreb', offset: 15 } });
  assert.equal(a.end, '21:00');
  assert.equal(a.endNextDay, false);
  assert.notEqual(a.start, t.maghreb);
  const b = resolvePrayerSchedule('2026-06-21', { start: '20:00', end: '', endPrayer: { key: 'fajr' } });
  assert.equal(b.endNextDay, true);
  assert.equal(b.end, calculatePrayerTimes('2026-06-22').fajr);
  assert.equal(resolvePrayerSchedule('2026-06-21', { start: '09:00', end: '10:00' }), null);
  const inst = resolvePrayerInstants('2026-06-21', { start: '', end: '21:00', startPrayer: 'maghreb' });
  assert.ok(inst.startAt < inst.endAt);
});

test('Hijri-anchored prayer booking follows the prayer on its resolved date', () => {
  const r = resolveBookingDates({
    dateBasis: 'hijri', hijriDate: { day: 1, month: 1, year: 1448 },
    startAt: '2026-01-01T08:00:00.000Z', endAt: '2026-01-01T10:00:00.000Z',
    startPrayer: { key: 'maghreb', offset: 0 }, endPrayer: null
  }, []);
  assert.equal(r.resolved, true);
  assert.ok(r.startAt < r.endAt);
});

const ctx = () => ({
  departments: [{ id: 'd1', name: 'MWA Programs' }], venues: [{ id: 'v1', name: 'Main Hall' }],
  existingById: {}, existingKeys: new Set(), hijriOverrides: []
});

test('import: Variable start uses the prayer, Booking Type header accepted', () => {
  const rep = validateImportRows([{
    Title: 'Majlis', 'Booking Type': 'MWA Programs', Venue: 'Main Hall', Date: '21/06/2026',
    'Start Type': 'Variable', 'Start Prayer': 'Maghreb', 'Start Offset': '15', 'End Type': 'Fixed', End: '21:00',
    'Speaker Name': 'Sheikh A', 'Program Details': 'Lecture'
  }], ctx());
  assert.deepEqual(rep.errors, []);
  const d = rep.rows[0].data;
  assert.deepEqual(d.startPrayer, { key: 'maghreb', offset: 15 });
  assert.equal(d.endPrayer, null);
  assert.equal(d.speakerName, 'Sheikh A');
  assert.equal(d.programDetails, 'Lecture');
  assert.ok(d.startAt < d.endAt);
});

test('import: Variable without a prayer and an unknown type are errors', () => {
  const rep = validateImportRows([
    { Title: 'A', 'Booking Type': 'MWA Programs', Venue: 'Main Hall', Date: '21/06/2026', 'Start Type': 'Variable', End: '21:00' },
    { Title: 'B', 'Booking Type': 'MWA Programs', Venue: 'Main Hall', Date: '21/06/2026', 'Start Type': 'Sometimes', Start: '10:00', End: '21:00' }
  ], ctx());
  assert.equal(rep.errors.length, 2);
  assert.match(rep.errors[0].message, /Start Prayer must be one of/);
  assert.match(rep.errors[1].message, /Start Type must be Fixed or Variable/);
});
