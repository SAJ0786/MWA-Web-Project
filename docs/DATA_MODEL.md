# Data model

All collections live in the default Firestore database. Timestamps are stored as ISO 8601
UTC strings (`startAt`/`endAt`) or Firestore server timestamps (`createdAt`, etc.); the UI
always renders them in the organisation timezone, `Australia/Sydney`.

## `keyIslamicEvents` (public annual reference data)

One document per recurring Islamic observance, keyed by a stable ID such as `ashura`.
This collection is independent of venue bookings so other app functionality can reuse
the same definitions through the Firestore SDK. Public read access is intentional.

| Field | Type | Notes |
|---|---|---|
| `name` | string | Event title; 1-240 characters |
| `day`, `month` | integer | Annual Hijri date (1-30, 1-12); no fixed year |
| `category` | string | Wiladat, Shahadat, Wafat, Eid, Ayyam-e-Aza, Amaal, Season or Event |
| `notes` | string | Reference notes, max 2,000 characters; public, never booking contact data |
| `enabled` | boolean | Disabled definitions are excluded from the annual list |
| `priority` | integer | 0-100; tie-breaker for the same Hijri date |
| `revision` | integer | Starts at zero; increments for each admin update |
| `updatedAt` | server timestamp | Set on each save |
| `updatedBy` | string | Saving admin UID, or migration identifier for the initial seed |

Only authenticated **admins** can create/update these records, enforced by Firestore
rules with a field whitelist and type/range checks. Deletes are denied. Edits are
transactional and reject a stale revision. Admins can add new recurring definitions
(enabled, priority 50, revision zero), which immediately enter the date-sorted list.
The page edits name/day/month/category,
preserving all remaining metadata. Gregorian dates are derived, never stored:
`hijriToGregorian(day, month, selectedYear, overrides)`. A day 30 in a 29-day
month is shown as unavailable rather than silently moving into the next month.
Changes affect the recurring definition in every year, not a year-specific exception.

Initial data is in `scripts/key-islamic-events.seed.json`, extracted from the Community
app's `hijriObservanceService.js` (54 definitions). The seed script creates missing
documents only; it never resets edited or disabled records. There is no runtime
hardcoded list or silent fallback when Firestore is unavailable.

## `events` (bookings)

| Field | Type | Notes |
|---|---|---|
| `title` | string | |
| `departmentId` | string | ref `departments/{id}` |
| `departmentName` | string | denormalized at write time for fast lists/exports |
| `venueId` | string | ref `venues/{id}` |
| `venueName` | string | denormalized |
| `startAt`, `endAt` | string (ISO UTC) | canonical Gregorian range used for conflict checks, iCal and the REST API |
| `status` | `pending` \| `confirmed` \| `rejected` \| `cancelled` | workflow: Pending → Confirmed/Rejected, or Cancelled from either |
| `visibility` | `private` \| `public` | **public submissions default `public`; admin-created bookings default `private`**; always editable by an admin, at any time, independent of status (see Visibility decision below) |
| `requestedVisibility` | `private` \| `public` | historical/audit record of the visibility chosen at submission time (equals `visibility` as first set; not updated by later admin edits) |
| `dateBasis` | `gregorian` \| `hijri` | how the requester entered the date |
| `hijriDate` | `{day, month, year}` \| null | source Hijri date if `dateBasis = hijri`. This is the fixed source of truth for Hijri-based bookings: `startAt`/`endAt` are the *resolved* Gregorian instant, recomputed from `hijriDate` (preserving the original local Australia/Sydney time-of-day) whenever the admin's moon-sighting overrides change — not just once at submission. An admin's own explicit date/time edit (`updateBooking` with a differing `startAt`/`endAt`) detaches the booking from its Hijri anchor (switches `dateBasis` to `gregorian`, clears `hijriDate`) so it is never silently moved again. Gregorian-based bookings (`dateBasis = gregorian`) never move — only their *displayed* Hijri equivalent is recomputed on the fly. |
| `hasConflict` | boolean | true if another pending/confirmed booking at the same venue overlaps (see venue buffer below); **never blocks submission or confirmation** |
| `conflictWith` | string[] | ids of the overlapping booking(s) |
| `contactName`, `contactEmail`, `contactPhone` | string | never exposed to public reads |
| `notes` | string | never exposed to public reads |
| `createdByUid` | string \| null | null for public (unauthenticated) submissions |
| `createdAt`, `updatedAt` | server timestamp | |
| `decidedBy`, `decidedByEmail`, `decidedAt`, `decisionNote` | | set by `decideBooking` |

### Visibility decision

Raw `events` documents are admin-only (Firestore rules); the public only ever sees a
**sanitized projection** (`functions/publicProjection.js`, a whitelist) via `getPublicEvents`,
`GET /v1/events` (unauthenticated) and the iCal feed: confirmed+public → full (no contact/notes);
confirmed+private → masked, title "Private"; pending → masked, title "Unconfirmed booking"
(regardless of `visibility`); rejected/cancelled → hidden. Masked items expose only id, status,
start/end, venue, Hijri date and the masked title. Public (unauthenticated) booking requests
default to `visibility: 'public'`; an admin creating a booking on someone's behalf defaults to `visibility: 'private'`
and may explicitly choose either in the booking form. An admin can change a booking's
visibility at any time afterwards — via `updateBooking` (general edit) or as part of
`decideBooking` (confirm/reject/cancel) — and every visibility change is recorded in the
audit log. Private hire details are therefore never visible publicly, and an admin always has the
final, explicit say over what is shown in full once it is confirmed.

### Recurring series fields

Occurrences of a recurring booking are ordinary `events` documents that additionally carry
`seriesId`, `seriesIndex` (1-based), `seriesCount` and a `recurrence` summary
(`basis`, `frequency`, `repeatEvery`, `endMode`, `count`/`endDate`, `startTime`, `endTime`).
Hijri-based series keep `dateBasis: 'hijri'` with a per-occurrence `hijriDate`, so the
moon-sighting adjustment trigger re-resolves each occurrence. Audit entries with
`entityType: 'series'` (`series_created`, `series_updated`) summarise bulk operations.

## `venues`

`name`, `capacity`, `hireable`, `openingHours`, `bufferHours`, `active`. Public read
(needed for the booking form), admin write.

`bufferHours` is a fractional number of hours (e.g. `0.5`) applied **only after** a
booking ends — an active (`pending`/`confirmed`) booking occupies `[startAt, endAt +
bufferHours]` for conflict-detection purposes. The buffer never extends backwards before
a booking's start, and it never blocks a new submission: it only affects whether
`hasConflict`/`conflictWith` is set on bookings checked against it. See
`functions/index.js`'s `findOverlaps`/`rangesOverlapBuffered`.

> Migration note: this field was renamed from `bufferMinutes` (whole minutes, no buffer
> semantics defined). No destructive Firestore migration was run or is required — every
> read path (`functions/index.js`'s `resolveBufferHours`, and the admin UI's
> `resolveVenueBufferHours`) resolves `bufferHours` first, falls back to converting a
> legacy `bufferMinutes` value (`/ 60`), and defaults to `0` if neither is present. New/
> edited venues are written with `bufferHours` only. If you want to physically migrate
> old documents, a one-off script can `set({ bufferHours: bufferMinutes / 60 }, { merge:
> true })` and remove `bufferMinutes`, but it's optional — the read-time fallback is safe
> indefinitely.

## `departments`

`name`, `colorHex`, `approvalRequired`, `active`. Public read, admin write.

> Note: the prototype also had a "Department user" login role that could create/edit its
> own department's bookings while signed in. The confirmed MVP scope only specifies
> **public submit (no sign-in)** and **admin sign-in**, so that role was not built. Adding
> it later is additive: a `role: departmentUser` + `departmentId` on `users/{uid}`, rules
> allowing writes scoped to that department, and a sign-in-gated version of the booking
> form.

## `users`

`{uid}` doc: `email`, `role` (`admin` in this MVP), `name` (optional). Created by an
existing admin or manually in the console — see docs/SETUP.md.

## `calendarSettings/hijri`

`overrides: [{ hYear, hMonth, gDate }]` — the moon-sighting anchors used by
`hijriService.js`'s tabular+override algorithm (ported unchanged from
`community-events-app`). `adjustedBy`, `updatedAt` record who last changed it, for the
audit trail. Public read (needed to render correct Hijri dates for guests), admin write.

## `auditLog`

`entityType`, `entityId`, `action` (`submitted`, `status_confirmed`, `status_rejected`,
`status_cancelled`, `updated`), `userId`, `userEmail`, `note`, `diff`, `timestamp`.
Written only by Cloud Functions (Admin SDK) — never directly by clients. Admin read only.

### Batch A–H additions

- `timeMode`: `custom` | `allDay` | `allNight` (see CHANGELOG for windows; overnight ends next civil day).
- Conflict rule: each active (pending/confirmed) booking occupies `[startAt, endAt + venue.bufferHours]`
  (`bufferHours`, falling back to legacy `bufferMinutes/60`); two bookings conflict if either occupancy overlaps the
  other's booked time. `hasConflict`/`conflictWith` are recomputed server-side after every mutation.
- Imported bookings are normal `events` docs (`createdByUid` = importing admin, audit action `imported`).

- venues.coversAllVenues (bool, optional): whole-site venue; conflicts with bookings at every venue. If unset, names containing 'entire'/'whole' are treated as whole-site.

- Imported rows with Date Basis = Hijri are stored Hijri-anchored (`dateBasis: 'hijri'`, `hijriDate {day,month,year}`); Gregorian rows as `dateBasis: 'gregorian'`.
- Public booking submissions must start at least `minimumPublicLeadHours` (default 6) after the current instant. The single shared setting is `functions/calendarPolicy.json`, consumed by the client and Cloud Functions; checks compare instants and use Australia/Sydney conversions for Gregorian and Hijri-resolved dates. The form rounds adjusted starts up to a 15-minute boundary, preserving custom duration where possible. All-day/all-night bookings move to the next eligible complete day/night. Admin creation, edits, recurring series and imports are exempt so historical records remain manageable; server booking endpoints enforce the rule for every non-admin submission.
