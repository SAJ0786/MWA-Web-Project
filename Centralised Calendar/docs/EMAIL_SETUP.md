# Email notifications ? setup

**Status: wired, inactive until the secrets below are set.** Which emails go to whom is defined in
`docs/NOTIFICATIONS.md`. Until the secrets exist, `sendMail()` logs a warning and returns
`{ sent: false, reason: 'not-configured' }`. It never throws, so bookings and admin decisions always succeed.

## Gmail / Google Workspace (admin@muhammadiwelfare.org.au)

1. Sign in as admin@muhammadiwelfare.org.au and turn on **2-Step Verification**. On Google Workspace,
   the Workspace admin must also allow app passwords.
2. Open https://myaccount.google.com/apppasswords, name it **MWA Events Calendar**, and copy the
   16-character password (without spaces). Never commit it or share it.
3. Set the Cloud Functions secrets. Each command prompts for the value:

```powershell
firebase functions:secrets:set SMTP_HOST  --project project-7a4fb531-414f-4ade-88e   # smtp.gmail.com
firebase functions:secrets:set SMTP_PORT  --project project-7a4fb531-414f-4ade-88e   # 465
firebase functions:secrets:set SMTP_USER  --project project-7a4fb531-414f-4ade-88e   # admin@muhammadiwelfare.org.au
firebase functions:secrets:set SMTP_PASS  --project project-7a4fb531-414f-4ade-88e   # the app password
firebase functions:secrets:set EMAIL_FROM --project project-7a4fb531-414f-4ade-88e   # "MWA Events Administrator" <admin@muhammadiwelfare.org.au>
```

4. Redeploy functions: `firebase deploy --only functions --project project-7a4fb531-414f-4ade-88e`.
   The two scheduled functions (`sendBookingReminders`, `sendPendingDigest`) use Cloud Scheduler,
   which needs the Blaze plan. Firebase enables the API on first deploy.

Gmail sends up to about 2,000 messages a day on Workspace (about 500 on a personal account), which is ample here.
Replies go to Events@muhammadiwelfare.org.au (`DEFAULT_REPLY_TO` in `functions/mailer.js`).

## Verifying

Submit a test booking, then check `firebase functions:log` for `[email] Send failed` (the SMTP error)
or `[email] Not configured`. Admin copies should arrive at Events@ with admin@ in CC.
