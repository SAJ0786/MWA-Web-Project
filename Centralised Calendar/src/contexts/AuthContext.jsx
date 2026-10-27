import {recordActivity} from '../services/auditService.js';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  GoogleAuthProvider, linkWithCredential, onAuthStateChanged, signInWithCredential,
  signInWithEmailAndPassword, signInWithPopup, signInWithRedirect, signOut
} from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db, firebaseConfigured } from '../firebase/firebase';
import { syncAdminAccess } from '../services/adminTeamService';

const AuthContext = createContext(null);

export const OWNER_EMAIL = 'admin@muhammadiwelfare.org.au';

const DENIED_MESSAGES = {
  'not-listed': 'This account is not on the MWA admin team list. Ask the account owner to add your email.',
  'unverified-email': 'This account’s email address is not verified. Use Sign in with Google instead.',
  'no-email': 'This account has no email address, so it cannot be checked against the admin list.',
  'password-disabled': 'Email/password sign-in has been turned off. Use Sign in with Google.'
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null); // users/{uid} doc, has .role
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [authError, setAuthError] = useState('');
  const [passwordLoginDisabled, setPasswordLoginDisabled] = useState(false);
  // Google credential waiting to be linked to an existing email/password account with the same email.
  const [pendingLink, setPendingLink] = useState(null);
  const syncedUid = useRef(null);
  const linking = useRef(false);

  useEffect(() => {
    if (!firebaseConfigured) {
      setLoading(false);
      return;
    }
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        syncedUid.current = null;
        setProfile(null);
        setLoading(false);
      }
    });
    return unsubAuth;
  }, []);

  // Public flag: hides the email/password form once the owner has signed in with Google.
  useEffect(() => {
    if (!firebaseConfigured) return undefined;
    return onSnapshot(doc(db, 'calendarSettings', 'auth'),
      snap => setPasswordLoginDisabled(snap.exists() && snap.data().passwordLoginDisabled === true),
      () => setPasswordLoginDisabled(false));
  }, []);

  async function runSync() {
    setSyncing(true);
    try {
      const res = await syncAdminAccess();
      if (res && res.admin === false) {
        setAuthError(DENIED_MESSAGES[res.reason] || DENIED_MESSAGES['not-listed']);
        await signOut(auth);
      } else {
        setAuthError('');
      }
    } catch {
      // If the check itself fails (e.g. offline), fall back to the stored role; rules still enforce it.
    } finally {
      setSyncing(false);
    }
  }

  // Check every signed-in account against the admin allowlist (server-side) once per session.
  useEffect(() => {
    if (!user || linking.current || syncedUid.current === user.uid) return;
    syncedUid.current = user.uid;
    runSync();
  }, [user]);

  useEffect(() => {
    if (!user) return undefined;
    const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      setProfile(snap.exists() ? snap.data() : null);
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [user]);

  const login = (email, password) => {
    setAuthError('');
    return signInWithEmailAndPassword(auth, email, password);
  };

  const loginWithGoogle = async () => {
    setAuthError('');
    setPendingLink(null);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      return await signInWithPopup(auth, provider);
    } catch (err) {
      if (err?.code === 'auth/popup-blocked' || err?.code === 'auth/operation-not-supported-in-this-environment') {
        return signInWithRedirect(auth, provider);
      }
      if (err?.code === 'auth/account-exists-with-different-credential') {
        const credential = GoogleAuthProvider.credentialFromError(err);
        const email = err?.customData?.email || '';
        if (credential) {
          setPendingLink({ credential, email });
          return null;
        }
      }
      throw err;
    }
  };

  /** One-off: prove ownership of the existing password account, attach Google to it, then
   * continue as a Google sign-in (same uid, so admin role and history are kept). */
  const completeGoogleLink = async (password) => {
    if (!pendingLink) throw new Error('Nothing to link.');
    setAuthError('');
    const { credential, email } = pendingLink;
    linking.current = true;
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      try {
        await linkWithCredential(result.user, credential);
      } catch (err) {
        if (err?.code !== 'auth/provider-already-linked') throw err;
      }
      const signed = await signInWithCredential(auth, credential);
      syncedUid.current = signed.user.uid;
    } catch (err) {
      linking.current = false;
      if (auth.currentUser) await signOut(auth);
      throw err;
    }
    linking.current = false;
    setPendingLink(null);
    await runSync();
  };

  const cancelGoogleLink = () => setPendingLink(null);
  const logout = async () => {await recordActivity('tools-automation','session.signout');return signOut(auth);};
  const isAdmin = profile?.role === 'admin';
  const isOwner = !!user && (user.email || '').toLowerCase() === OWNER_EMAIL;

  return (
    <AuthContext.Provider value={{
      user, profile, isAdmin, isOwner, loading: loading || syncing, login, loginWithGoogle, logout, authError,
      passwordLoginDisabled, pendingLink, completeGoogleLink, cancelGoogleLink
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
