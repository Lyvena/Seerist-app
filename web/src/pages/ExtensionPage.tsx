import { useApp } from '../state/AppContext';

export default function ExtensionPage() {
  const { activeWs } = useApp();
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Chrome Extension</h1>
          <p className="sub">Dual-duty and compliance-first: capture jobs you're already browsing (zero automated traffic) and autofill approved proposals (you click Submit — always).</p>
        </div>
      </div>

      <div className="grid cols-2">
        <div className="card">
          <h3>1 · Install (developer mode)</h3>
          <ol className="muted" style={{ paddingLeft: 18, lineHeight: 2 }}>
            <li>Grab the <code>extension/</code> folder from the <a href="https://github.com/Lyvena/Seerist-app" target="_blank" rel="noreferrer">Seerist-app repo</a> (or your team's distribution zip).</li>
            <li>Open <code>chrome://extensions</code> and enable <strong>Developer mode</strong>.</li>
            <li>Click <strong>Load unpacked</strong> and select the <code>extension</code> folder.</li>
            <li>Pin "Seerist Capture" to your toolbar.</li>
          </ol>
          <p className="faint">Web Store publishing needs a developer account — planned for the public launch.</p>
        </div>

        <div className="card">
          <h3>2 · Sign in & pick this workspace</h3>
          <ol className="muted" style={{ paddingLeft: 18, lineHeight: 2 }}>
            <li>Click the Seerist icon and sign in with your Seerist email + password.</li>
            <li>Select the workspace to capture into{activeWs ? <> — e.g. <strong>{activeWs.name}</strong></> : ''}.</li>
            <li>That's it. The extension stores captures locally if you're offline and syncs when the API is reachable again.</li>
          </ol>
        </div>

        <div className="card">
          <h3>3 · Capture while you browse</h3>
          <p className="muted">On any Upwork job page you'll see a <strong>"Capture to Seerist"</strong> button. One click sends the title, description, budget, and client stats — everything already rendered on your own screen — into the Pitch Queue. No polling, no scraping runs, no server-to-server traffic against Upwork.</p>
        </div>

        <div className="card">
          <h3>4 · Autofill, then YOU submit</h3>
          <p className="muted">On the Upwork proposal editor, the <strong>"Autofill from Seerist"</strong> button inserts your approved draft into the cover-letter field. Seerist never clicks submit — no scripted or automated submission exists anywhere in the product, in any phase. That's a hard architectural constraint, not a setting.</p>
        </div>
      </div>

      <div className="info-box mt">
        <strong>Why extension-capture first?</strong> It ships without waiting on Upwork's developer-API approval (a multi-week process we've applied for in parallel), requires zero automated traffic against the platform, and stays the permanent fallback for any platform without usable API access. When the Upwork key lands, API-based polling slots in as a second JobSource — additive, never a replacement.
      </div>
    </>
  );
}
