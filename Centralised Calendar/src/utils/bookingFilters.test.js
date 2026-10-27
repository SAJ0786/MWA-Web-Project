import test from 'node:test';
import assert from 'node:assert/strict';
import { filterBookings, activeFilterCount, describeFilters } from './bookingFilters.js';

const key = iso => iso.slice(0, 10);
const events = [
  { id: '1', title: 'Quran class', startAt: '2030-01-05T10:00:00Z', departmentId: 'd1', venueId: 'v1', status: 'confirmed', contactName: 'Ali' },
  { id: '2', title: 'Wedding', startAt: '2030-02-05T10:00:00Z', departmentId: 'd2', venueId: 'v2', status: 'pending' },
  { id: '3', title: 'Private booking', startAt: '2030-03-05T10:00:00Z', departmentId: 'd1', venueId: 'v1', status: 'confirmed', masked: true, contactName: 'Hidden' }
];
const ids = list => list.map(e => e.id);

test('no filters returns everything', () => assert.deepEqual(ids(filterBookings(events, {}, key)), ['1', '2', '3']));
test('date range is inclusive', () => assert.deepEqual(ids(filterBookings(events, { from: '2030-02-05', to: '2030-03-05' }, key)), ['2', '3']));
test('venue and status combine', () => assert.deepEqual(ids(filterBookings(events, { venueId: 'v1', status: 'confirmed' }, key)), ['1', '3']));
test('booking type filter excludes masked bookings', () => assert.deepEqual(ids(filterBookings(events, { departmentId: 'd1' }, key)), ['1']));
test('search matches visible fields only', () => {
  assert.deepEqual(ids(filterBookings(events, { search: 'ali' }, key)), ['1']);
  assert.deepEqual(ids(filterBookings(events, { search: 'hidden' }, key)), []);
  assert.deepEqual(ids(filterBookings(events, { search: ' WEDD ' }, key)), ['2']);
});
test('active count and summary', () => {
  const f = { from: '2030-01-01', venueId: 'v1', search: '  ' };
  assert.equal(activeFilterCount(f), 2);
  assert.equal(describeFilters(f, { venues: [{ id: 'v1', name: 'Main Hall' }] }), 'From 2030-01-01 · Main Hall');
});
