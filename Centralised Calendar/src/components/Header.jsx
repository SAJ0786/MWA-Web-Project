import { useState } from 'react';
import { CalendarDays, ListChecks, MoonStar, Plus, ShieldCheck, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import logoUrl from '../assets/mwa-logo.png';
import AppearanceControl from './AppearanceControl.jsx';
import { defaults } from '@mwa/appearance';

export default function Header({ tab, setTab, onNewBooking }) {
  const { user, isAdmin, logout } = useAuth();
  const [brandLogo,setBrandLogo]=useState(defaults.logo||logoUrl);
  const navBtn = (id, label, Icon) => (
    <button type="button" className={`lb lb-nav ${tab === id ? 'nav-active' : ''}`} aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}><Icon />{label}</button>
  );
  return (
    <header className="app-header glass-panel decorative-panel">
      <button type="button" className="brand brand-logo" onClick={() => setTab('calendar')} aria-label="MWA Events & Bookings Calendar home">
        <span className="brand-logo-tile"><img src={brandLogo||logoUrl} alt="Muhammadi Welfare Association logo" /></span>
        <strong>MWA Events &amp; Bookings Calendar</strong>
      </button>
      <nav aria-label="Main navigation">
        {navBtn('calendar', 'Calendar', CalendarDays)}
        {navBtn('bookings', 'Bookings', ListChecks)}
        {navBtn('islamic-events', 'Key Islamic Events', MoonStar)}
        {isAdmin && navBtn('admin', 'Admin', ShieldCheck)}
      </nav>
      <div className="header-actions">
        <AppearanceControl onBrandChange={setBrandLogo}/>
        <button type="button" className="lb lb-default" onClick={onNewBooking}><Plus />New booking</button>
        {user && isAdmin ? (
          <button type="button" className="lb lb-outline" onClick={logout} title={`Signed in as ${user.email}`} aria-label={`Sign out (${user.email})`}><LogOut />Sign out</button>
        ) : (
          <>
            <a className="lb lb-outline" href={`${defaults.websiteUrl}/admin-login`}><ShieldCheck />Admin sign in</a>
            <span className="visitor" title="Viewing as a public visitor"><span />Public visitor</span>
          </>
        )}
      </div>
      <a className="mwa-home-link" href={defaults.websiteUrl}>← MWA website</a>
    </header>
  );
}
