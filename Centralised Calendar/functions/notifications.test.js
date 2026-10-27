const test = require('node:test');
const assert = require('node:assert');
const n = require('./notifications');

const booking = {
  title: 'Majlis', contactName: 'Ali', contactEmail: 'ali@example.com', contactPhone: '0400',
  startAt: '2026-11-05T08:00:00.000Z', endAt: '2026-11-05T10:00:00.000Z',
  venueName: 'Main Hall', departmentName: 'MWA Programs', startPrayer: 'maghreb',
  speakerName: 'Sheikh A', notes: 'internal note', venueId: 'v1'
};
const hijri = { day: 14, month: 5, year: 1448 };

test('submission: requester gets a pending receipt without admin-only details', () => {
  const m = n.submissionRequester(booking, hijri);
  assert.equal(m.to, 'ali@example.com');
  assert.match(m.subject, /received/);
  assert.match(m.text, /Pending/);
  assert.match(m.text, /14 Jumada al-Ula 1448 AH/);
  assert.match(m.text, /7:00 pm \(Maghreb\)/);
  assert.doesNotMatch(m.text, /internal note|0400/);
});

test('submission: admin inbox with CC; overlap prefix and list only when overlapping', () => {
  const plain = n.submissionAdmin(booking, hijri, []);
  assert.equal(plain.to, n.ADMIN_TO);
  assert.equal(plain.cc, n.ADMIN_CC);
  assert.doesNotMatch(plain.subject, /Overlap/);
  assert.match(plain.text, /internal note/);
  const flagged = n.submissionAdmin(booking, hijri, [{ title: 'Wedding', status: 'confirmed', startAt: booking.startAt, endAt: booking.endAt, venueName: 'Main Hall' }]);
  assert.match(flagged.subject, /^\u26A0 Overlap/);
  assert.match(flagged.text, /Wedding/);
});

test('decision emails by status; unknown status or no email gives null', () => {
  assert.match(n.decisionRequester(booking, hijri, 'confirmed').subject, /confirmed/);
  const r = n.decisionRequester(booking, hijri, 'rejected', 'Hall unavailable');
  assert.match(r.subject, /declined/);
  assert.match(r.text, /Hall unavailable/);
  assert.equal(n.decisionRequester(booking, hijri, 'pending'), null);
  assert.equal(n.decisionRequester({ ...booking, contactEmail: '' }, hijri, 'confirmed'), null);
  assert.equal(n.cancellationAdmin(booking, hijri, 'a@b.c').cc, n.ADMIN_CC);
});

test('scheduleChanged only for date/time/venue', () => {
  assert.equal(n.scheduleChanged(booking, { ...booking, title: 'X' }), false);
  assert.equal(n.scheduleChanged(booking, { ...booking, venueId: 'v2' }), true);
  assert.equal(n.scheduleChanged(booking, { ...booking, endAt: '2026-11-05T11:00:00.000Z' }), true);
});

test('pending digest is skipped when empty and sorted otherwise', () => {
  assert.equal(n.pendingDigestAdmin([]), null);
  const m = n.pendingDigestAdmin([{ ...booking, title: 'B', startAt: '2026-12-01T00:00:00Z' }, { ...booking, title: 'A' }]);
  assert.ok(m.text.indexOf('A \u2013') < m.text.indexOf('B \u2013'));
  assert.match(m.subject, /^2 booking/);
});

test('html escapes user content', () => {
  const m = n.submissionRequester({ ...booking, title: '<b>x</b>' }, hijri);
  assert.ok(!m.html.includes('<b>x</b>'));
  assert.ok(m.html.includes('&lt;b&gt;x&lt;/b&gt;'));
});

test('ics attachment and Sydney date key', () => {
  const a = n.icsAttachment(booking, 'abc');
  assert.match(a.content, /DTSTART:20261105T080000Z/);
  assert.match(a.content, /UID:abc@/);
  assert.equal(n.sydneyDateKey(new Date('2026-10-26T20:00:00Z'), 2), '2026-10-29');
});
