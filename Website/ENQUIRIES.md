# Contact & Enquiries

Open Admin Console → Contact & Enquiries, or https://mwa-community-web.web.app/enquiries/.

## Owner connection

1. Use a Google Cloud project owned by the MWA Workspace organisation for the mailbox OAuth client. A separate OAuth project avoids changing the audience of existing website/member authentication. Firebase hosting, enquiry data and functions remain in the existing MWA Firebase project.
2. Enable Gmail API in the OAuth client project. Configure Google Auth Platform branding and audience (Internal where supported). The existing Firebase project's Gmail API has also been enabled, but no mailbox credentials are installed by deployment.
3. Add scopes `https://www.googleapis.com/auth/gmail.readonly` and `https://www.googleapis.com/auth/gmail.send`. Create a Web application OAuth client with this authorised redirect URI:

   `https://mwa-community-web.web.app/api/enquiries/oauth/callback`

4. Download the OAuth client JSON. Sign into the website as `admin@muhammadiwelfare.org.au`, open Contact & Enquiries → Mailbox connection, and choose the downloaded JSON. Do not commit it or paste credentials into chat.
5. Select Connect admin mailbox with Google. Choose the dedicated admin mailbox, approve both requested Gmail permissions, and return to the dashboard. The connection status must say Connected. No authorisation of the info mailbox is needed: it only receives notifications.
6. Submit a genuine enquiry using an address you control. Verify notification at info, reply from dashboard, verify the received sender is admin, and reply from your test address. Confirm the reply appears and info receives another notification. Test Resolve (a subsequent visitor reply reopens) and Spam (a subsequent reply is suppressed). Mail processing runs approximately every two minutes.

Workspace policies may require a Workspace administrator to approve the OAuth client. An external app in Testing normally receives a refresh token lasting seven days; do not treat that as a permanent production connection. Use an appropriate internal/trusted organisation configuration or complete applicable Google production verification. Do not change the existing Firebase Google sign-in audience as part of mailbox setup.

References: [Google OAuth token lifetime](https://developers.google.com/identity/protocols/oauth2), [restricted scope verification and exceptions](https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification).

## Behaviour and boundaries

- Public webform submissions are stored before notification delivery; a reference is returned. Submission retries use the same request ID to avoid duplicates. Honeypot and hashed-IP rate limiting (5 per 15 minutes) apply; public submissions have no admin privileges.
- Every dashboard API call checks a verified Firebase token, users role, Admin Team allowlist (owner exception), and the existing password-login policy. Direct Firestore client access to enquiry, queue, credentials, mapping and state collections is denied, even to an admin browser. The Admin SDK supplies authorised responses.
- Messages support customer text, emailed admin replies and internal notes. Actions include assign/unassign self, statuses, read indicators, search over loaded records, pagination, retry and audit entries in the Enquiries module. Version checks reject stale modifications. Only one reply per thread may await delivery at a time.
- Team notifications go to info; replies go from admin with Reply-To admin. Notification emails include an authenticated dashboard button. Customer reply association uses Gmail thread IDs and RFC reply references, not subject-only matching.
- Resolved enquiries reopen on customer replies. Spam suppresses notifications and queued mail; admins can restore it. Wrong-sender or failed-authentication messages appear for manual review without notifying info. Automatic replies and messages sent by the admin mailbox are ignored to prevent loops.
- The worker uses Gmail history plus recovery scans of already-linked threads. It does not import unrelated mailbox messages. Gmail permissions themselves cover the mailbox; only the dedicated admin account can authorise setup.
- Credentials and OAuth tokens are stored in server-only Firestore, encrypted at rest by Google Cloud, with no values returned by status endpoints or recorded in audit. Access is limited by Firestore rules for browser clients and existing project IAM for operators. OAuth uses state, PKCE, a secure HttpOnly cookie, expiration and one-time consumption. Disconnect clears stored tokens and attempts Google token revocation.
- Email queue writes are atomic with messages/audit. Worker leases and deterministic RFC Message-IDs support retry reconciliation. Gmail success means accepted for sending, not confirmed delivery to the recipient. SMTP bounces/delivery receipts are not parsed. A rare ambiguous send is shown as uncertain and may need a Gmail check before manual retry; exactly-once external delivery is not guaranteed.
- Attachments are not uploaded or downloaded by the module. Incoming filenames are listed; files remain in Gmail. HTML is converted to text, with original extracted text retained (up to 50,000 characters). Some unusual MIME/character encodings or quote formats may require viewing the original email in Gmail.
- Search and filters apply to loaded threads; load older records to extend the search. Replies sync around every two minutes and the open dashboard refreshes every 30 seconds. Sending limits, Google outages and revoked access can delay delivery. Failed team notifications can be retried by the owner; failed replies by listed admins.
- Enquiries, messages and audit records are retained until an operational retention policy is introduced. Expired OAuth states and rate-limit buckets are cleaned up by the worker. No automatic deletion of conversations is enabled.

## Verification

Run the Node core tests with `node --test functions/enquiries.test.js functions/enquiries-oauth.test.js`. The transaction/OAuth tests require `FIRESTORE_EMULATOR_HOST`; never point them at production. Use the `demo-mwa-enquiries` project in a fresh Firestore emulator loaded with the calendar Firestore rules, then also run `node --test website/enquiries-rules.test.mjs`.

The emulator suite verifies input/rate limiting, submission/reply idempotency, allowlist and password policy, stale writes, durable queued delivery, send reconciliation, reply deduplication, resolved reopening, spam suppression, mismatched senders, client-read/write denial, owner-only setup, secure OAuth cookies and state replay rejection. Full website and standalone/embedded calendar builds must pass. Live mailbox delivery remains an acceptance check after owner authorisation.

## Custom website address and JSON upload (29 October 2026)

The API now accepts the verified hosting domain `https://refreshed.muhammadiwelfare.org.au` as well as the Firebase website addresses. The file selector retains the selected JSON and displays upload success or failure beside it. A disabled Connect button means the server has not yet confirmed a saved configuration.

Google OAuth still uses the callback registered in this guide at `mwa-community-web.web.app`. Starting Connect from the custom domain therefore first opens the Firebase website's Mailbox connection screen. Sign in there as the owner if prompted, then click Connect again. The saved configuration is shared; no second upload is required. Keeping the OAuth start and callback on the same host preserves the secure state cookie. Once connected, admins can use the custom domain normally.

## Enquiry list and conversation selection

The conversation pane only displays the selected enquiry while it appears in the filtered list. Status filters, search and refreshed status changes clear a selection that no longer matches. An empty list shows an empty conversation state; returning to a broader filter does not automatically reopen a previous thread. Drafts hidden by filtering are retained in memory for this page session and restored when that enquiry is selected again (not saved across a page reload). Notification deep links start in All enquiries and include the linked thread even when it is older than the first loaded page.
