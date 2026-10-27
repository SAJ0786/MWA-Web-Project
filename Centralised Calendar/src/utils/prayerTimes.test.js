import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { calculatePrayerTimes, resolvePrayerSchedule, sanitizePrayer } from './prayerTimes.js';

const require = createRequire(import.meta.url);
const server = require('../../functions/prayerTimes.js');

test('client and server prayer times stay in lockstep', () => {
  for (const d of ['2026-01-15', '2026-04-05', '2026-06-21', '2026-10-04', '2026-12-21']) {
    assert.deepEqual(calculatePrayerTimes(d), server.calculatePrayerTimes(d), d);
  }
  const spec = { start: '', end: '', startPrayer: { key: 'isha', offset: 30 }, endPrayer: { key: 'fajr', offset: -15 } };
  assert.deepEqual(resolvePrayerSchedule('2026-06-21', spec), server.resolvePrayerSchedule('2026-06-21', spec));
  assert.deepEqual(sanitizePrayer('Zohrain'), server.sanitizePrayer('Zohrain'));
});
