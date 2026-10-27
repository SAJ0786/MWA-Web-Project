# MWA Web Project

The Muhammadi Welfare Association website and central Events & Bookings Calendar share one Firebase project, one admin identity system, and one appearance library.

- [Community website](https://mwa-community-web.web.app)
- [Admin Login](https://mwa-community-web.web.app/admin-login)
- [Website CMS](https://mwa-community-web.web.app/cms)
- [Calendar with the website's sign-in session](https://mwa-community-web.web.app/calendar/)
- [Key Islamic Events](https://mwa-community-web.web.app/islamic-events/)
- [Existing calendar address](https://eventscalendar.muhammadiwelfare.org.au)

## Source folders

`Website/` contains the new community website, CMS function, shared colour palettes, appearance library and multi-site hosting configuration. `Centralised Calendar/` contains the existing React calendar and its booking services, rules and functions. The calendar imports the appearance library from its sibling Website folder. Keep these folder names when cloning.

Member Login and the website's donation/contact/membership forms remain prototype demonstrations. Admin Login reuses the existing calendar admin accounts. The prayer timetable remains a sample. The website programme panels and calendar use confirmed live MWA Programs.

## Local development and publishing

Use Node.js 22 with dependencies installed for the same processor architecture as Node. Windows ARM users should keep their Node and installed native build-tool architectures consistent.

Install dependencies in both folders with `npm ci`. Copy `Website/.env.example` to `Website/.env.local` and `Centralised Calendar/.env.example` to `Centralised Calendar/.env`, using the Firebase web configuration for project `project-7a4fb531-414f-4ade-88e`. Environment files are deliberately excluded from Git.

From Website, `npm run dev` starts the website. `npm run build` builds the website, its mounted calendar and the standalone calendar. `npm run deploy` publishes only the two hosting targets. For CMS deployments, first run `npm --prefix functions ci`, then `firebase deploy --only functions:mwa-website --project project-7a4fb531-414f-4ade-88e`. Existing booking backend deployments remain separate; do not run an unrestricted Firebase deploy.

Publishing website content also publishes shared appearance defaults. Visitors may choose a local palette or light/dark/system setting, or reset to website defaults. Website admin sign-in is shared with `/calendar/` on the same origin; browsers keep sessions on the older calendar domain separate.

## Verification

The current source snapshot includes the existing calendar improvements that were already present locally, followed by the website/appearance integration. All 48 calendar utility checks and five CMS validation checks pass. Production bundles were built and deployed; public calendar access, anonymous CMS write rejection, the admin entry, shared visitor preferences, and 320px/390px layouts were checked. Actual Google account sign-in requires verification by the account holder.

Previous website code, calendar appearance backups, project documents, secure documents, local settings, dependency folders and build outputs remain local and are excluded from this repository. See each application's README and calendar docs for implementation details.

The website header provides Home, shared appearance controls, and session-aware Admin Login / Admin Sign out. Its Admin Console presents 12 modules with icons; Events & Bookings Hub, Calendar Management, Tools & Automation, and Website CMS are live. Key Islamic Events is a separate website page. The calendar remains beneath the shared website header, with booking functionality preserved.

Public booking policy: guests and non-admin accounts may create only **Events Booking** requests. Signed-in approved admins may create any active booking type, including Events Booking. This is enforced by the booking form and both server submission routes (`submitBooking` and `POST /v1/events`), using the stored department record. Existing bookings and public calendar visibility are unchanged.
