# Setup checklist

## Current deployment status (updated after the initial deploy)

This project **is now connected and deployed** to Firebase project
`project-7a4fb531-414f-4ade-88e` ("MWA Central Cal"):

- Firestore database created in `australia-southeast1` (Sydney); `firestore.rules` and
  `firestore.indexes.json` are deployed.
- Authentication → Email/Password sign-in is enabled.
- All 6 Cloud Functions (`submitBooking`, `decideBooking`, `updateBooking`,
  `getPublicEvents`, `icalFeed`, `api`) are deployed to `australia-southeast1` on the
  Node.js 22 runtime, with public invoker access granted (authorization is enforced
  inside the functions, not at the Cloud Run layer).
- Hosting is deployed and live at **https://project-7a4fb531-414f-4ade-88e.web.app**,
  with `/v1/**` and `/ical` rewritten to the Cloud Functions.
- Email secrets (`SMTP_HOST`/`PORT`/`USER`/`PASS`, `EMAIL_FROM`) exist in Secret Manager
  as **empty placeholders** only, so functions deploy; email sending stays inactive
  until real SMTP credentials are set — see `docs/EMAIL_SETUP.md`.
- `.env` (local-only, gitignored) is populated with the **public** Firebase web SDK
  config for this project (API key etc. — these are not secrets; they identify the app,
  not grant access, which is enforced by `firestore.rules` and the Cloud Functions).

**Deployment note**: this project was newly created under Google's current default IAM
policy (no automatic broad role grant to the default service account), so the following
one-time IAM grants were required and already applied, for anyone deploying a similar
project from scratch:
- `roles/cloudbuild.builds.builder` and `roles/datastore.user` to the default Compute
  Engine service account (`<project-number>-compute@developer.gserviceaccount.com`) —
  without these, Cloud Functions builds fail and/or can't read/write Firestore.
- `roles/run.invoker` for `allUsers` on each deployed Cloud Run service backing a
  function — without this, even public (anonymous) requests get HTTP 403 before
  reaching the function code.

**Still pending (needs you, not a deploy step)**: create the first admin account and
seed venues/departments — see steps 4–5 below. No admin account exists yet.

## 1. Connect the Firebase project (already done for this deployment)

1. In the [Firebase console](https://console.firebase.google.com/), open your existing
   project.
2. **Project settings → General → Your apps** → add a **Web app** (if you don't have one
   yet) and copy the config values.
3. Copy `.env.example` to `.env` and paste in `VITE_FIREBASE_*` values.
4. Edit `.firebaserc` and replace `REPLACE_WITH_YOUR_FIREBASE_PROJECT_ID` with your real
   project ID.

## 2. Enable the Firebase products this app uses (already done for this deployment)

In the console, enable:
- **Authentication** → Sign-in method → **Email/Password** (this is the only sign-in
  method; admins only, no public self-signup).
- **Firestore Database** (production mode; the rules in `firestore.rules` lock it down).
- **Functions** (requires the project to be on the Blaze plan — Cloud Functions always
  does, even for the free tier of usage).
- **Hosting** (optional until you're ready to deploy).

## 3. Install dependencies

```powershell
npm install
cd functions; npm install; cd ..
```

## 4. Admin access: Google sign-in + admin team list

Admins sign in with **Google** (email/password still works as a backup). Access is decided
server-side by the `adminAllowlist` collection, managed in the app under **Admin → Admin team**.

One-off console step: **Authentication → Sign-in method → Add new provider → Google → Enable**
(choose a project support email). Check **Authentication → Settings → Authorized domains**
includes the hosting domain (`<project>.web.app` is there by default; add any custom domain).

Bootstrapping:
- Existing admins (`users/{uid}.role == "admin"`, created in the console) are added to the list
  automatically the next time they sign in.
- If there are no admins yet, create one in the console as before: **Authentication → Users →
  Add user**, then a Firestore doc `users/{uid}` with `role` = `admin` and `email`. Sign in once,
  then add the rest of the team by email under **Admin → Admin team**.

Adding a person: the owner enters their Google email; they then click *Sign in with Google*.
Removing a person revokes access immediately (role set to `revoked`, sessions revoked) and is
audited. Every sign-in, denied attempt, add and remove is written to the Audit log (`admin.*` actions).

**Owner rules.** `admin@muhammadiwelfare.org.au` is the account owner (`OWNER_EMAIL` in
`functions/adminAccess.js`). It cannot be removed, and only it can add or remove admins; every other
admin has all other admin privileges and sees a read-only team list.

**Linking the existing password account.** The owner already has an email/password account. The first
time it clicks *Sign in with Google*, Firebase reports that the email already has a password account
(`auth/account-exists-with-different-credential`). The app then asks for that password once and links Google to
the same account (same uid, role and history).

**Password login switches off.** As soon as the owner signs in with Google, the server sets
`calendarSettings/auth.passwordLoginDisabled = true` (audited as `admin.password_login_disabled`). From then on the
email/password option disappears from the login screen and the functions and Firestore rules refuse
password sessions for every account. To re-enable it (emergency only), delete the
`calendarSettings/auth` document in the Firestore console.

## 5. Seed venues and departments

The public booking form needs at least one venue and department to exist. Either:
- **Firestore console**: create a few documents in `venues` (fields: `name`, `capacity`,
  `hireable`, `bufferHours` — fractional hours applied only after a booking ends, see
  docs/DATA_MODEL.md, `active`) and `departments` (fields: `name`, `colorHex`,
  `approvalRequired`, `active`), or
- Sign in as the admin you created and use **Admin → Venues / Departments** in the app.

## 6. Run locally

```powershell
npm run dev
```

To exercise the Cloud Functions locally instead of a deployed project, use the Firebase
emulator suite (`firebase emulators:start`) — requires the Firebase CLI
(`npm install -g firebase-tools`) and `firebase login`.

## 7. Deploy (already done for this project — commands used for reference)

```powershell
firebase deploy --only firestore:rules,firestore:indexes
firebase deploy --only functions
npm run build
firebase deploy --only hosting
```

To redeploy after future code changes, rerun the relevant command(s) above.

## 8. Email notifications (optional, deferred)

Booking submission/decision emails are wired up but **inactive** until SMTP credentials
are configured as Cloud Functions secrets. See **docs/EMAIL_SETUP.md**.

## 9. Key Islamic Events initial data

This feature needs the updated `firestore.rules` and an initial reference-data import.
No new Cloud Functions or dependencies are required. The application reads only the
Firestore collection; an empty collection shows an explicit empty state, and permission
or network failures show a retryable error, never a hardcoded fallback.

After release is authorized, deploy the rules and run the create-only migration using
Application Default Credentials for an account allowed to write this project's Firestore.
Do not put service-account keys in the repository. Firebase CLI sign-in alone does not
necessarily provide Application Default Credentials.

```powershell
# With approved Application Default Credentials configured:
firebase deploy --only firestore:rules --project project-7a4fb531-414f-4ade-88e
node scripts\seed-islamic-events.cjs project-7a4fb531-414f-4ade-88e
```

The script uses the existing `functions` dependencies (restore with `npm ci --prefix functions`
only if absent). Re-running it preserves all existing records and admin edits.
Build and release Hosting through the existing deployment procedure when authorized.
Only users with `users/{uid}.role == "admin"` see editing controls.

### Local verification without production writes

```powershell
firebase emulators:start --only firestore,auth --project demo-mwa-islamic-events
# In a separate PowerShell window:
$env:FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'
node scripts\seed-islamic-events.cjs demo-mwa-islamic-events
node --test scripts\islamic-events.rules.test.mjs
node --test "src\utils\*.test.js"
```

The rules test uses a demo project, public and non-admin clients, and an emulator-only
admin profile. Never direct this test at production.
