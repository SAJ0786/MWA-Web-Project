# MWA Central Calendar — MVP

A shared, source-of-truth booking calendar for venues and departments, built with
**React + Vite** (frontend) and **Firebase** (Auth, Firestore, Cloud Functions, Hosting).

Public visitors can browse confirmed public events and submit booking requests without
signing in. Admins sign in with Google (email/password as backup; access limited to the
admin team list) to review requests, confirm/reject/cancel
bookings, manage venues/departments, adjust the Hijri moon-sighting correction, and see
an audit log.

This repository was scaffolded from `Community Hub Calendar – Prototype & Brief.html`
and `Prototype and Brief/Community-Calendar-Project-Brief.docx` in this folder (the
app has since been renamed to MWA Central Calendar; the original prototype/brief
filenames are kept as-is for provenance), and reuses the Hijri calendar conversion
logic from the `community-events-app` repository (see `src/services/hijriService.js`).

## Status

This MVP is deployed to Firebase project `project-7a4fb531-414f-4ade-88e`
("MWA Central Cal"), Hosting + Firestore + Cloud Functions all in `australia-southeast1`:

- **Live site**: https://project-7a4fb531-414f-4ade-88e.web.app
- **Source code**: https://github.com/SAJ0786/MWA_Central_Cal

**Not yet done (needs a human decision, not a deploy step)**: no admin account exists
yet, and no venues/departments are seeded, so the app currently shows an empty public
calendar with nothing to book against. See **docs/SETUP.md §4–5** to create the first
admin and seed starter data. Email sending is deployed but inactive (safe no-op) until
real SMTP credentials are configured — see **docs/EMAIL_SETUP.md**.

See **docs/SETUP.md** for the full setup/deploy reference.

Implemented:
- Month calendar with department/venue filters, Gregorian + Hijri dual dates, admin
  moon-sighting adjustment.
- Public booking request form → always submitted as **Pending**; a venue/time overlap
  never blocks submission, it's flagged (`hasConflict`) for the admin to decide.
- Admin review queue: confirm / reject / cancel, with a visibility choice (public/private)
  made at confirm time.
- Public/private visibility: public visitors only ever see `status=confirmed` **and**
  `visibility=public` events, served through a Cloud Function / REST endpoint — never
  direct Firestore reads — so private hire details can't leak.
- Audit log of every submission, decision and edit.
- iCal (.ics) export (client-side, and a live public feed at `/ical`) and CSV export.
- Versioned REST API under `/v1` (see **docs/API.md**).
- Email integration seam (**docs/EMAIL_SETUP.md**) — safe no-op until a provider's SMTP
  credentials are set as Cloud Functions secrets; nothing claims to send email until it
  actually can.

Deferred / out of scope for this MVP (per the brief): payments/ticketing, recurring-series
exceptions, resource inventory, and a separate "department user" login role (the prototype
had one; the confirmed MVP scope is public-submit + admin-approve only — see
**docs/DATA_MODEL.md** for the reasoning).

## Project layout

```
src/                 React app (Vite)
  firebase/           Firebase SDK init + env-based config
  services/           Firestore/Functions client wrappers (events, venues,
                       departments, Hijri, audit, CSV/iCal export)
  contexts/           Auth context (admin session)
  pages/              Calendar, Bookings list, Admin dashboard
  components/         Header, booking modal
functions/           Cloud Functions (Admin SDK): conflict checks, approvals,
                       public API, iCal feed, email seam
firestore.rules      Security rules (admin-only event writes/reads; public
                       reads only through Cloud Functions)
firestore.indexes.json
firebase.json        Hosting + Functions + Firestore wiring
docs/                Setup, data model, API, email configuration
```

## Local development

```powershell
npm install
copy .env.example .env   # fill in your Firebase web app config
npm run dev
```

The app will show a clear "Firebase is not configured" message instead of crashing if
`.env` is missing — see docs/SETUP.md for the full checklist (project ID, enabling Auth/
Firestore, deploying rules and functions, creating the first admin user).

No deployment has been performed as part of this change.

## Key Islamic Events

The **Key Islamic Events** navigation button opens an annual, three-column directory
(event title, Hijri date, Gregorian date). It defaults to the current Sydney Hijri year
and offers five years either side. Gregorian dates use this app's existing moon-sighting
anchors. **This month**, **Next month** and **Full year** buttons plus a custom month
dropdown filter the date-ordered list. The first two jump to the actual current/next
Hijri month (including year rollover); the year selector can browse another year.
Wiladat/Eid use green, mourning observances red, and other occasions blue,
matching the Community app. Navigation and admin sections use decorative green/gold
panels with prominent buttons.

The list is loaded live from Firestore `keyIslamicEvents`, **not from a client-side
default list**. Admins can edit titles, Hijri day/month and category; saves apply to
the recurring definition for every year. Non-admin signed-in users and visitors remain
read-only. Admins can also add a title and Hijri day/month (with category); Gregorian
dates calculate automatically and new events appear in the correct Hijri date order.
A revision guard prevents overwriting another admin's changes.

The initial 54 definitions from the Community app are supplied as a one-time,
create-only migration, not runtime fallback data. Before releasing this feature,
deploy the updated Firestore rules and import the list using the steps in
[docs/SETUP.md](docs/SETUP.md#9-key-islamic-events-initial-data).
