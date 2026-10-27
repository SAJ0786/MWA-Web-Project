# Email notification matrix (approved)

Status: **wired, inactive until SMTP secrets are set.** Messages are built in `functions/notifications.js`
(unit tested in `notifications.test.js`) and sent best-effort by `functions/mailer.js`: a missing secret or
SMTP error is logged and never blocks or fails a booking action. Setup steps: `docs/EMAIL_SETUP.md`.

- **Sender:** "MWA Events Administrator" <admin@muhammadiwelfare.org.au> (the `EMAIL_FROM` secret).
- **Reply-to:** Events@muhammadiwelfare.org.au.
- **Admin recipients:** To Events@muhammadiwelfare.org.au, CC admin@muhammadiwelfare.org.au
  (constants `ADMIN_TO` / `ADMIN_CC` in `functions/notifications.js`).
- Every email carries the MWA header, Gregorian + Islamic date, time (with prayer basis), venue, booking type and
  a link to eventscalendar.muhammadiwelfare.org.au. Requester emails never include other bookings, notes or program extras.

| # | Trigger | Requester / contact | Admins | Notes |
| --- | --- | --- | --- | --- |
| 1 | Public submits a request (`submitBooking`) | "Booking request received" (Pending) | "New booking request" | Admin email includes contact details and notes |
| 2 | Request overlaps another booking | Same as #1 (overlap not disclosed) | Subject prefixed "? Overlap", overlaps listed | |
| 3 | Admin confirms (`decideBooking`) | "Booking confirmed" + `booking.ics` attachment | ? | |
| 4 | Admin rejects | "Booking declined" with the admin's note | ? | |
| 5 | Admin cancels | "Booking cancelled" with note | "Booking cancelled" | |
| 6 | Admin changes date/time/venue of a confirmed booking (`updateBooking`) | "Booking updated" (shows previous slot) | ? | Not sent for title/notes edits; one email per series edit |
| 7 | Admin deletes a confirmed booking (`deleteBooking`) | "Booking cancelled" | ? | Pending / rejected / cancelled deletions send nothing |
| 8 | Admin creates a booking or recurring series | One summary email to the contact | ? | Admin-entered single bookings don't alert the admin inbox |
| 9 | Excel import (`importBookings`) | ? | ? | |
| 10 | Program extras changed | ? | ? | Admin-only data, never emailed |
| 11 | Moon-sighting adjustment moves a Hijri-anchored booking (`onHijriSettingsChanged`) | "Date changed after moon sighting" (confirmed only) | One digest of all moved bookings | Only when the civil date actually moves |
| 12 | 2 days before a confirmed booking (`sendBookingReminders`, daily 9 am Sydney) | "Reminder" | ? | `reminderSentFor` prevents duplicates |
| 13 | Daily pending digest (`sendPendingDigest`, 8 am Sydney) | ? | List of pending requests | Only if any are pending |
