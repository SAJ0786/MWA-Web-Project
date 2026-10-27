# MWA website and calendar

Firebase project: `project-7a4fb531-414f-4ade-88e`.

- Website: https://mwa-community-web.web.app
- Admin entry: https://mwa-community-web.web.app/admin-login
- Website CMS: https://mwa-community-web.web.app/cms
- Calendar with the same browser sign-in: https://mwa-community-web.web.app/calendar/
- Existing calendar address: https://eventscalendar.muhammadiwelfare.org.au

The website and the sibling `Centralised Calendar` folder are the local source code. Install website dependencies with `npm ci`, then `npm run build`. The build creates the website, its `/calendar/` mount and the existing standalone calendar bundle. Calendar dependencies also need to be installed in its own folder. Run `npm run dev` for the website alone. Do not use an unrestricted Firebase deploy: use the explicit hosting targets in `npm run deploy`. Install CMS dependencies with `npm --prefix functions ci`. Deploy the CMS separately with `firebase deploy --only functions:mwa-website`.

The existing calendar Authentication provider, verified admin team, password policy and booking services are reused. Sign in through the website; the calendar under `/calendar/` shares the browser session. Browsers isolate sign-in and visitor preferences between different domains, so existing calendar domains link back to the website's admin entry. Guests continue to see the public calendar. Member Login remains the prototype membership demonstration.

The six palettes live in `shared/palettes.js`; both apps import `shared/appearance.js`. Published CMS content lives in `websiteContent/main`. Publishing also updates public `calendarSettings/websiteAppearance`, which both apps watch. Visitor overrides use `mwa-appearance-v1` in browser storage. Resetting appearance resumes website defaults. Logo updates also reach the calendar. Content writes require an existing approved admin session, validate the full document, and reject stale revisions. No booking records, existing functions or Firestore rules were changed.

The exported prototype content is the initial seed, including sample prayer/programme information. These website panels remain prototype content; the linked calendar uses the existing live calendar services. The architecture document was reviewed as context; its broader finance, membership and future module roadmap has not been implemented.

Visual changes in Centralised Calendar are limited to `src/main.jsx`, `src/App.jsx`, `src/components/Header.jsx`, `src/components/AppearanceControl.jsx`, `src/website-appearance.css`, `src/assets/mwa-logo.png` and `vite.config.js`. A dated archive beside Website preserves the entire old website and a separate backup preserves the original calendar files. Restore those files and redeploy the calendar bundle to roll back its appearance. Existing booking business code and rules remain authoritative in Centralised Calendar.

Verification: the existing 48 calendar utility tests pass; five CMS validation tests pass. Production builds cover both calendar base paths. Public CMS reads and denied anonymous writes are checked separately. Real admin authentication requires the account holder's Google sign-in; no credentials or test bookings are created by this migration.
