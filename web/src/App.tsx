import { Navigate, NavLink, Route, Routes } from 'react-router-dom';
import { useApp } from './state/AppContext';
import AuthPage from './pages/AuthPage';
import OnboardingPage from './pages/OnboardingPage';
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
      <div className="logo-mark">
        <svg width="18" height="18" viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="10" fill="none" stroke="#38bdf8" strokeWidth="3" />
          <circle cx="16" cy="16" r="4" fill="#38bdf8" />
        </svg>
      </div>
      <div>
        <div className="logo-name">Seerist</div>
        <div className="logo-tag">Win the work. Grow the product.</div>
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const { user, profile, orgs, activeOrg, setActiveOrg, workspaces, activeWs, setActiveWs, signOut } = useApp();
  const initials = (profile?.name || user?.email || '?').slice(0, 2).toUpperCase();
  return (
    <div className="shell">
      <aside className="sidebar">
        <Logo />
        <div className="switcher">
          <label>Organization</label>
          <select value={activeOrg?.id || ''} onChange={(e) => setActiveOrg(e.target.value)}>
            {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
          <label>Workspace</label>
          <select value={activeWs?.id || ''} onChange={(e) => setActiveWs(e.target.value)}>
            {workspaces.map((w) => <option key={w.id} value={w.id}>{w.name} ({w.type})</option>)}
          </select>
        </div>
        <nav className="nav">
          <div className="nav-section">Bid engine</div>
          <NavLink to="/queue"><span className="icon">📋</span> Pitch Queue</NavLink>
          <NavLink to="/analytics"><span className="icon">📈</span> Analytics</NavLink>
          <NavLink to="/extension"><span className="icon">🧩</span> Chrome Extension</NavLink>
          <div className="nav-section">Delivery & growth</div>
          <NavLink to="/delivery"><span className="icon">🚚</span> Delivery Engine</NavLink>
          <NavLink to="/growth"><span className="icon">🌱</span> Growth Engine</NavLink>
          <div className="nav-section">Organization</div>
          <NavLink to="/personas"><span className="icon">🤖</span> AI Employees</NavLink>
          <NavLink to="/settings"><span className="icon">⚙️</span> Settings</NavLink>
        </nav>
        <div className="sidebar-footer">
          <div className="user-chip">
            <div className="avatar">{initials}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{profile?.name || 'Member'}</div>
              <div className="email">{user?.email}</div>
            </div>
          </div>
          <button className="btn ghost sm" style={{ width: '100%', justifyContent: 'center' }} onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      </aside>
      <main className="main"><div className="container">{children}</div></main>
    </div>
  );
}

export default function App() {
  const { loading, user, orgs } = useApp();

  if (loading) {
    return <div className="center-page"><div className="row"><span className="spinner" /> <span className="muted">Loading Seerist…</span></div></div>;
  }
  if (!user) return <AuthPage />;
  if (!orgs.length) return <OnboardingPage />;

  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Navigate to="/queue" replace />} />
        <Route path="/queue" element={<PitchQueuePage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/delivery" element={<DeliveryPage />} />
        <Route path="/growth" element={<GrowthPage />} />
        <Route path="/personas" element={<PersonasPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/extension" element={<ExtensionPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="*" element={<Navigate to="/queue" replace />} />
      </Routes>
    </Shell>
  );
}
