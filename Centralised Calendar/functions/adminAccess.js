// Admin team access rules (pure, unit-tested). Firestore I/O lives in index.js.
//
// Source of truth: adminAllowlist/{normalisedEmail}. A Google (or email/password) account
// becomes an admin only when its verified email is on that list. users/{uid}.role mirrors it
// because firestore.rules check the role on every request.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// The account owner: always an admin, cannot be removed, and the only one who can add/remove admins.
// Their first Google sign-in turns off email/password admin sign-in for everyone.
const OWNER_EMAIL = 'admin@muhammadiwelfare.org.au';

function isOwner(email) {
  return normalizeEmail(email) === OWNER_EMAIL;
}

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function isValidEmail(value) {
  const e = normalizeEmail(value);
  return e.length > 0 && e.length <= 254 && EMAIL_RE.test(e);
}

/**
 * Decide what a sign-in means.
 *  - allowlisted + verified email          → grant admin
 *  - legacy admin (role admin, never managed by the list, e.g. created in the console)
 *    → keep admin and migrate onto the list so the list becomes complete
 *  - previously list-managed admin no longer listed → revoke
 *  - everyone else                          → deny
 */
function decideSignIn({ email, emailVerified, allowlisted, userDoc, provider, passwordLoginDisabled }) {
  const e = normalizeEmail(email);
  if (!e) return { action: 'deny', reason: 'no-email' };
  if (provider === 'password' && passwordLoginDisabled) return { action: 'deny', reason: 'password-disabled', email: e };
  const isAdminDoc = !!(userDoc && userDoc.role === 'admin');
  if (isOwner(e) && emailVerified) return { action: 'grant', email: e, owner: true };
  // Anyone can self-register an email/password account with an unverified address, so an
  // unverified email is only trusted when this uid is already an admin (set server-side/console).
  if (!emailVerified && !isAdminDoc) return { action: 'deny', reason: 'unverified-email', email: e };
  if (allowlisted) return { action: 'grant', email: e };
  if (isAdminDoc && !userDoc.allowlistManaged) return { action: 'migrate', email: e };
  if (isAdminDoc) return { action: 'revoke', email: e };
  return { action: 'deny', reason: 'not-listed', email: e };
}

/** Guard removals so the team can never lock itself out. */
function checkRemoval({ target, requesterEmail, listedEmails }) {
  const t = normalizeEmail(target);
  if (!isOwner(requesterEmail)) return `Only ${OWNER_EMAIL} can remove admins.`;
  if (!isValidEmail(t)) return 'Enter a valid email address.';
  if (isOwner(t)) return `${OWNER_EMAIL} is the account owner and cannot be removed.`;
  if (!listedEmails.includes(t)) return 'That email is not on the admin list.';
  if (t === normalizeEmail(requesterEmail)) return 'You cannot remove your own access. Ask another admin.';
  if (listedEmails.length <= 1) return 'At least one admin must remain.';
  return null;
}

/** Only the owner may add admins. Returns an error message or null. */
function checkAddition({ target, requesterEmail }) {
  if (!isOwner(requesterEmail)) return `Only ${OWNER_EMAIL} can add admins.`;
  if (!isValidEmail(target)) return 'Enter a valid email address.';
  return null;
}

/** Whether an authenticated session may act as admin, given how it signed in. */
function sessionAllowed({ provider, passwordLoginDisabled }) {
  return !(provider === 'password' && passwordLoginDisabled);
}

/** The owner's Google sign-in switches email/password admin sign-in off. Only reached after
 * decideSignIn granted access, so the account is already a verified or existing admin. */
function shouldDisablePasswordLogin({ email, provider }) {
  return isOwner(email) && provider === 'google.com';
}

module.exports = {
  OWNER_EMAIL, isOwner, normalizeEmail, isValidEmail, decideSignIn, checkRemoval, checkAddition,
  sessionAllowed, shouldDisablePasswordLogin
};
