import {useEffect,useState} from 'react';
import {Trash2} from 'lucide-react';
import {OWNER_EMAIL} from '../contexts/AuthContext.jsx';
import {watchAdminTeam,addAdminEmail,removeAdminEmail} from '../services/adminTeamService.js';
export default function TeamTab({ currentEmail, canManage }) {
  const [team, setTeam] = useState(null);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState(null);

  useEffect(() => watchAdminTeam(setTeam, () => setMsg({ err: true, text: 'Could not load the admin list.' })), []);

  const fmt = iso => iso ? new Date(iso).toLocaleString('en-AU', { timeZone: 'Australia/Sydney', dateStyle: 'medium', timeStyle: 'short' }) : '—';

  async function add(e) {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) { setMsg({ err: true, text: 'Enter a valid email address.' }); return; }
    setBusy('add'); setMsg(null);
    try {
      await addAdminEmail(value);
      setEmail('');
      setMsg({ err: false, text: `${value} can now sign in with Google (or email/password).` });
    } catch (err) {
      setMsg({ err: true, text: err?.message || 'Could not add that email.' });
    } finally { setBusy(''); }
  }

  async function remove(target) {
    if (!window.confirm(`Remove admin access for ${target}? They will be signed out of admin features immediately.`)) return;
    setBusy(target); setMsg(null);
    try {
      await removeAdminEmail(target);
      setMsg({ err: false, text: `${target} no longer has admin access.` });
    } catch (err) {
      setMsg({ err: true, text: err?.message || 'Could not remove that email.' });
    } finally { setBusy(''); }
  }

  return (
    <div className="team-tab">
      <p className="muted">
        People on this list can sign in as admins with their Google account (or an email/password account using the same address).
        Every sign-in and change is recorded in the Audit log. Remove someone here to revoke their access immediately.
      </p>
      {!canManage && (
        <p className="team-owner-note" role="note">Only {OWNER_EMAIL} can add or remove admins.</p>
      )}
      {canManage && <form className="team-add" onSubmit={add}>
        <div className="field">
          <label htmlFor="team-email">Add admin email</label>
          <input id="team-email" type="email" placeholder="name@gmail.com" value={email} onChange={e => setEmail(e.target.value)} disabled={!!busy} />
        </div>
        <button className="btn pri" type="submit" disabled={!!busy || !email.trim()}>{busy === 'add' ? 'Adding…' : 'Add'}</button>
              </form>}
      {msg && <div className={msg.err ? 'err' : 'ok'} role={msg.err ? 'alert' : 'status'}>{msg.err ? '⚠ ' : '✓ '}{msg.text}</div>}
      <div className="wrap">
        <table>
          <thead><tr><th>Email</th><th>Name</th><th>Added by</th><th>Added</th><th>Last sign-in</th><th aria-label="Actions" /></tr></thead>
          <tbody>
            {team === null && <tr><td colSpan={6} className="muted">Loading…</td></tr>}
            {team && team.map(m => (
              <tr key={m.id}>
                <td>{m.email || m.id}{m.id === OWNER_EMAIL && <span className="team-you">owner</span>}{m.id === currentEmail && <span className="team-you">you</span>}</td>
                <td>{m.displayName || '—'}</td>
                <td>{m.addedBy || '—'}</td>
                <td>{fmt(m.addedAt)}</td>
                <td>{m.lastSignInAt ? fmt(m.lastSignInAt) : <span className="muted">Never</span>}</td>
                <td>
                  {canManage && m.id !== currentEmail && m.id !== OWNER_EMAIL && (
                    <button type="button" className="btn del" title={`Remove ${m.id}`} aria-label={`Remove ${m.id}`}
                      disabled={!!busy || team.length <= 1} onClick={() => remove(m.id)}>
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {team && !team.length && <tr><td colSpan={6} className="muted">No one is on the list yet. Existing admins are added automatically the next time they sign in.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

