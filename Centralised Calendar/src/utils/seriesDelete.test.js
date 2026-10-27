import test from 'node:test';
import assert from 'node:assert/strict';
import { planSeriesDeletes } from './seriesDelete.js';

const a1 = { id: 'a1', seriesId: 'A', startAt: '2030-01-01T00:00:00Z' };
const a2 = { id: 'a2', seriesId: 'A', startAt: '2030-01-08T00:00:00Z' };
const a3 = { id: 'a3', seriesId: 'A', startAt: '2030-01-15T00:00:00Z' };
const b1 = { id: 'b1', seriesId: 'B', startAt: '2030-02-01T00:00:00Z' };
const solo = { id: 's', startAt: '2030-03-01T00:00:00Z' };

test('single scope deletes each selected booking once', () => {
  const plans = planSeriesDeletes([a2, a3, solo], 'single');
  assert.deepEqual(plans.map(p => [p.anchor.id, p.scope]), [['a2', 'single'], ['a3', 'single'], ['s', 'single']]);
});

test('all scope makes one call per series and keeps non-series single', () => {
  const plans = planSeriesDeletes([a3, a2, b1, solo], 'all');
  assert.deepEqual(plans.map(p => [p.anchor.id, p.scope]), [['s', 'single'], ['a2', 'all'], ['b1', 'all']]);
  const allA = plans.find(p => p.anchor.id === 'a2');
  assert.deepEqual([a1, a2, a3, b1].filter(e => allA.covers(e)).map(e => e.id), ['a1', 'a2', 'a3']);
});

test('future scope anchors at the earliest selected occurrence', () => {
  const [plan] = planSeriesDeletes([a3, a2], 'future');
  assert.equal(plan.anchor.id, 'a2');
  assert.deepEqual([a1, a2, a3].filter(e => plan.covers(e)).map(e => e.id), ['a2', 'a3']);
});

test('covers skips occurrences that have already started', () => {
  const [plan] = planSeriesDeletes([a2], 'all');
  assert.deepEqual([a1, a2, a3].filter(e => plan.covers(e, '2030-01-05T00:00:00Z')).map(e => e.id), ['a2', 'a3']);
});
