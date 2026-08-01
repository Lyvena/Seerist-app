import { useCallback, useEffect, useState } from 'react';
import { callFn } from '../lib/insforge';
import { useApp } from '../state/AppContext';
import type { JobSourceStatus } from '../lib/types';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { CopyRow } from '../components/UI';

const PLATFORMS = ['Upwork', 'Fiverr', 'Freelancer.com', 'Toptal'];

export default function ExtensionPage() {
  const { activeWs } = useApp();
  const [sources, setSources] = useState<JobSourceStatus[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!activeWs) return;
    try {
      const res = await callFn<{ sources: JobSourceStatus[] }>('job-sources', { op: 'list_sources', workspace_id: activeWs.id });
      setSources(res.sources || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load job sources');
    }
  }, [activeWs?.id]);

  useEffect(() => { void load(); }, [load]);

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow"><Icon name="radar" /> Find work</div>
          <h1>Three ways in, none of them scraping</h1>
          <p className="sub">
            Seerist can only pitch for work it can see. It gets there by reading the job alerts you
            already receive, by capturing what you are already browsing, and — where a platform has
            approved us — by its own API. Submission is always your click. Supported on {PLATFORMS.join(', ')}.
          </p>
        </div>
      </div>

      {/* Email intake first: it is the only path that finds a job before the
          user has gone looking for it. */}
      <div className="card accent">
        <div className="spread">
          <div style={{ maxWidth: 620 }}>
            <h3 className="row" style={{ gap: 8 }}><Icon name="mail" /> Forward your job alerts — the fastest way in</h3>
            <p className="muted" style={{ fontSize: 13.5, marginTop: 4 }}>
              Every platform already emails you when something matching your search is posted.
              Forward those emails to this workspace's intake address and the jobs land in your
              Pitch Queue, scored, before you have opened your inbox. Nothing is scraped and nothing
              is submitted — it is your own mail.
            </p>
          </div>
          <Link className="btn primary" to="/settings"><Icon name="bolt" /> Set up intake</Link>
        </div>
        {activeWs?.intake_token ? (
          <div className="mt">
            <CopyRow value={`jobs+${activeWs.intake_token}@inbound.seerist.xyz`} label="This workspace's intake address" />
          </div>
        ) : null}
      </div>

      <div className="grid cols-2 mt">
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
          <p className="muted">On a job page you'll see a <strong>"Capture to Seerist"</strong> button. One click sends the title, description, budget and client stats — everything already rendered on your own screen — into the Pitch Queue.</p>
          <p className="muted">On a <strong>search-results page</strong> you get <strong>"Capture all N to Seerist"</strong> instead, which takes the whole page of results in one click rather than one posting at a time. Jobs you already have are recognised and never duplicated.</p>
        </div>

        <div className="card">
          <h3>4 · Autofill, then YOU submit</h3>
          <p className="muted">On a proposal editor, the <strong>"Autofill from Seerist"</strong> button inserts your approved draft into the platform's own proposal field. Seerist never clicks submit — no scripted or automated submission exists anywhere in the product, in any phase. That's a hard architectural constraint, not a setting.</p>
        </div>
      </div>

      <div className="card mt">
        <div className="spread">
          <h3 style={{ marginBottom: 0 }} className="row"><Icon name="database" /> Job sources</h3>
          <button className="btn ghost sm" onClick={() => void load()}><Icon name="refresh" /></button>
        </div>
        <p className="muted mt">
          Extension capture is always live. Each platform's API-polling source is built and code-complete — it activates by itself the moment that platform's developer access is approved. Nothing here is a stub waiting to be written.
        </p>
        {error && <div className="warn-box mt">{error}</div>}
        {!activeWs ? (
          <p className="faint mt">Select a workspace to see its source status.</p>
        ) : !sources.length ? (
          <p className="faint mt">Loading sources…</p>
        ) : (
          <table className="data mt">
            <thead><tr><th>Source</th><th>Kind</th><th>State</th><th>Why</th><th></th></tr></thead>
            <tbody>
              {sources.map((s) => (
                <tr key={`${s.platform}-${s.kind}`}>
                  <td style={{ fontWeight: 600 }}>{s.platform}</td>
                  <td><span className="badge violet">{s.kind.replace('_', ' ')}</span></td>
                  <td><span className={`badge ${s.active ? 'green' : 'gray'}`}>{s.active ? 'active' : 'awaiting approval'}</span></td>
                  <td className="muted" style={{ maxWidth: 420 }}>{s.reason}</td>
                  <td>
                    {s.kind === 'api_poll' && (
                      <button className="btn sm" disabled={!!busy}
                        onClick={async () => {
                          setBusy(s.platform); setError(null);
                          try {
                            const res = await callFn<{ inserted: number; fetched: number }>('job-sources', {
                              op: 'poll', workspace_id: activeWs.id, platform: s.platform,
                            });
                            setError(`Polled ${s.platform}: ${res.fetched} returned, ${res.inserted} new.`);
                          } catch (e) {
                            setError(e instanceof Error ? e.message : 'Poll failed');
                          } finally {
                            setBusy(null); void load();
                          }
                        }}>
                        {busy === s.platform ? <span className="spinner" /> : 'Poll'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="info-box mt">
        <strong>Why extension-capture first?</strong> It ships without waiting on any platform's developer-API approval (a multi-week process per platform), requires zero automated traffic against the platform, and stays the permanent fallback for any platform without usable API access. When a developer key lands, that platform's API polling slots in as a second JobSource — additive, never a replacement.
      </div>

      <div className="warn-box mt">
        <strong>Submission is always a human click.</strong> The authorized-partnership submission path is built and sits behind a per-platform flag that is off for every platform, and can only be switched on server-side once Seerist has an explicit Business-Manager-style relationship with that platform. Until then Seerist refuses to submit and hands the job back to you and the extension. Scripted submission through your own session does not exist in this codebase and never will — it is what gets accounts permanently banned.
      </div>
    </>
  );
}
