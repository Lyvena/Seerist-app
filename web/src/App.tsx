import { useState } from 'react';
import { Navigate, NavLink, Route, Routes } from 'react-router-dom';
import { useApp } from './state/AppContext';
import { Icon, Logomark } from './components/Icon';
import AuthPage from './pages/AuthPage';
import OnboardingPage from './pages/OnboardingPage';
import HomePage from './pages/HomePage';
import PitchQueuePage from './pages/PitchQueuePage';
import AnalyticsPage from './pages/AnalyticsPage';
import DeliveryPage from './pages/DeliveryPage';
import GrowthPage from './pages/GrowthPage';
import PersonasPage from './pages/PersonasPage';
import SettingsPage from './pages/SettingsPage';
import ExtensionPage from './pages/ExtensionPage';

function Logo() {
  return (
    <div className="logo">
      <Logomark size={34} />
      <div>
        <div className="logo-name">Seerist</div>
        <div className="logo-tag">Win the work. Grow the product.</div>
      </div>
    </div>
  );
}

const NEW_ORG = '__new_org__';

/**
 * Creem is our Merchant of Record, so its buyer terms apply to every purchase
 * alongside ours. MoR platforms require these to be reachable from anywhere in
 * the product, not just the checkout screen. All open in a new tab.
 */
function LegalLinks() {
  const links: Array<[string, string]> = [
    ['Terms', 'https://seerist.xyz/terms'],
    ['Privacy', 'https://seerist.xyz/privacy'],
    ['Refunds', 'https://seerist.xyz/refunds'],
    ['Cookies', 'https://seerist.xyz/cookies'],
  ];
  return (
    <div className="legal-links">
      {links.map(([label, href]) => (
        <a key={label} href={href} target="_blank" rel="noopener noreferrer">{label}</a>
      ))}
      <a href="https://creem.io/legal/buyer-terms" target="_blank" rel="noopener noreferrer">
        Payments by Creem
      </a>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const { user, profile, orgs, activeOrg, setActiveOrg, workspaces, activeWs, setActiveWs, signOut } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const initials = (profile?.name || user?.email || '?').slice(0, 2).toUpperCase();

  const sidebar = (
    <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
      <Logo />
      <div className="switcher">
        <label>Organization</label>
        <select
          value={activeOrg?.id || ''}
          onChange={(e) => {
            if (e.target.value === NEW_ORG) { window.location.href = '/onboarding?new=org'; return; }
            setActiveOrg(e.target.value);
          }}
        >
          {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          <option value={NEW_ORG}>＋ New organization…</option>
        </select>
        <label>Workspace</label>
        <select value={activeWs?.id || ''} onChange={(e) => setActiveWs(e.target.value)}>
          {workspaces.map((w) => <option key={w.id} value={w.id}>{w.name} ({w.type})</option>)}
          {!workspaces.length && <option value="">No workspaces yet</option>}
        </select>
      </div>
      <nav className="nav" onClick={() => setMenuOpen(false)}>
        <NavLink to="/home"><Icon name="home" /> Home</NavLink>
        <div className="nav-section">Bid engine</div>
        <NavLink to="/queue"><Icon name="queue" /> Pitch Queue</NavLink>
        <NavLink to="/analytics"><Icon name="analytics" /> Analytics</NavLink>
        <NavLink to="/extension"><Icon name="radar" /> Find work</NavLink>
        <div className="nav-section">Delivery &amp; growth</div>
        <NavLink to="/delivery"><Icon name="delivery" /> Delivery Engine</NavLink>
        <NavLink to="/growth"><Icon name="growth" /> Growth Engine</NavLink>
        <div className="nav-section">Organization</div>
        <NavLink to="/personas"><Icon name="personas" /> AI Employees</NavLink>
        <NavLink to="/settings"><Icon name="settings" /> Settings</NavLink>
      </nav>
      <div className="sidebar-footer">
        <div className="user-chip">
          <div className="avatar">{initials}</div>
          <div style={{ minWidth: 0 }}>
            <div className="who">{profile?.name || 'Member'}</div>
            <div className="email">{user?.email}</div>
          </div>
        </div>
        <button className="btn ghost sm block" onClick={() => void signOut()}>Sign out</button>
        <LegalLinks />
      </div>
    </aside>
  );

  return (
    <div className="shell">
      <div className="mobile-bar">
        <button className="btn ghost sm" onClick={() => setMenuOpen(true)} aria-label="Open menu">
          <Icon name="queue" /> Menu
        </button>
        <span className="row" style={{ gap: 7 }}>
          <Logomark size={20} />
          <span style={{ fontFamily: 'var(--font-head)', fontWeight: 700 }}>Seerist</span>
        </span>
        <span className="faint">{activeWs?.name || ''}</span>
      </div>
      {menuOpen && <div className="sidebar-scrim" onClick={() => setMenuOpen(false)} />}
      {sidebar}
      <main className="main"><div className="container">{children}</div></main>
    </div>
  );
}

export default function App() {
  const { loading, user, orgs } = useApp();

  if (loading) {
    return (
      <div className="center-page">
        <div style={{ textAlign: 'center' }}>
          <Logomark size={44} />
          <div className="row" style={{ justifyContent: 'center', marginTop: 12 }}>
            <span className="spinner" /> <span className="muted">Loading Seerist…</span>
          </div>
        </div>
      </div>
    );
  }
  if (!user) return <AuthPage />;
  if (!orgs.length) return <OnboardingPage />;

  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/queue" element={<PitchQueuePage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/delivery" element={<DeliveryPage />} />
        <Route path="/growth" element={<GrowthPage />} />
        <Route path="/personas" element={<PersonasPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/extension" element={<ExtensionPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </Shell>
  );
}
