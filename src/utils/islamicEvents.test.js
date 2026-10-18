import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { eventGregorianDate, eventsForHijriYear, filterIslamicEvents, formatObservanceDate, observanceTone, validateIslamicEvent } from './islamicEvents.js';
import { addHijriMonths, getHijriParts, getHijriMonthLength, getTodayHijriParts, hijriToGregorian } from '../services/hijriService.js';

const seed = JSON.parse(fs.readFileSync(new URL('../../scripts/key-islamic-events.seed.json', import.meta.url)));
const event = { name: 'Test observance', day: 13, month: 7, category: 'Wiladat', enabled: true };

test('all 54 Community seed events have valid, unique recurring definitions', () => {
  assert.equal(seed.length, 54);
  assert.equal(new Set(seed.map(e => e.id)).size, 54);
  seed.forEach(validateIslamicEvent);
});

test('each annual event converts with the existing Hijri method for all 11 selectable years', () => {
  const current = getTodayHijriParts([], new Date('2026-10-18T08:00:00Z')).year;
  for (let year = current - 5; year <= current + 5; year++) {
    for (const item of seed) {
      const key = eventGregorianDate(item, year);
      if (item.day > getHijriMonthLength(year, item.month)) {
        assert.equal(key, null);
      } else {
        assert.deepEqual(getHijriParts(key), { year, month: item.month, day: item.day });
      }
    }
  }
});

test('editing Hijri date or selected year recomputes the Gregorian date with moon-sighting anchors', () => {
  const overrides = [{ hYear: 1448, hMonth: 7, gDate: '2026-12-12' }];
  assert.equal(eventGregorianDate(event, 1448, overrides), '2026-12-24');
  assert.equal(eventGregorianDate({ ...event, day: 14 }, 1448, overrides), '2026-12-25');
  assert.notEqual(eventGregorianDate(event, 1449, overrides), eventGregorianDate(event, 1448, overrides));
});

test('day 30 in a short month is clearly unavailable instead of silently rolling into next month', () => {
  const month = Array.from({ length: 12 }, (_, i) => i + 1).find(m => getHijriMonthLength(1448, m) === 29);
  assert.equal(eventGregorianDate({ ...event, month, day: 30 }, 1448), null);
  assert.match(formatObservanceDate(null), /29 days/);
});

test('events sort by Hijri date and priority, exclude disabled records and do not mutate source', () => {
  const items = [{ ...event, id: 'later', month: 12 }, { ...event, id: 'first', month: 1 },
    { ...event, id: 'hidden', enabled: false }];
  const rows = eventsForHijriYear(items, 1448);
  assert.deepEqual(rows.map(e => e.id), ['first', 'later']);
  assert.equal(items[0].id, 'later');
  assert.equal(rows[0].gregorianDate, hijriToGregorian(13, 1, 1448));
});

test('invalid edits fail and tones match the Community calendar categories', () => {
  for (const patch of [{ name: '' }, { name: '   ' }, { day: 0 }, { day: 31 }, { day: 1.5 }, { month: 0 }, { month: 13 }, { category: 'invalid' }]) {
    assert.throws(() => validateIslamicEvent({ ...event, ...patch }));
  }
  assert.equal(observanceTone('Eid'), 'happy');
  assert.equal(observanceTone('Wiladat'), 'happy');
  for (const c of ['Shahadat', 'Wafat', 'Ayyam-e-Aza']) assert.equal(observanceTone(c), 'sad');
  assert.equal(observanceTone('Amaal'), 'occasion');
});

test('month filtering preserves date order and full-year restores every event', () => {
  const rows = eventsForHijriYear(seed, 1448);
  assert.deepEqual(filterIslamicEvents(rows), rows);
  const ramadan = filterIslamicEvents(rows, 9);
  assert(ramadan.length > 0);
  assert(ramadan.every(event => event.month === 9));
  assert.deepEqual(ramadan.map(event => event.day), [...ramadan.map(event => event.day)].sort((a, b) => a - b));
  assert.deepEqual(addHijriMonths(1448, 12, 1), { year: 1449, month: 1 });
});
