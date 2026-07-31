import { useCallback, useEffect, useState } from 'react';
import { callFn, INSFORGE_URL } from '../lib/insforge';
import type { VisitorIntentRecord, VisitorIntentSettings } from '../lib/types';

/**
 * Visitor intent and identification (spec §4, Module C).
 *
 * Built closed. Spec §4/§6/§11 are explicit that this category carries
 * GDPR/CCPA-style disclosure and consent obligations that vary by jurisdiction,
 * so the feature stays off until a human declares the jurisdiction and a live
 * privacy-policy URL, and the backend refuses visitor records until then.
 */

export default function VisitorsTab({ wsId }: { wsId: string }) {
  const [settings, setSettings] = useState<VisitorIntentSettings | null>(null);
  const [records, setRecords] = useState<VisitorIntentRecord[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [jurisdiction, setJurisdiction] = useState('');
  const [policyUrl, setPolicyUrl] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);

  const load = useCallback(async () => {
    const s = await callFn<VisitorIntentSettings>('visitor-intent', { op: 'get_settings', workspace_id: wsId });
    setSettings(s);
    setJurisdiction(s.jurisdiction || '');
    setPolicyUrl(s.policy_url || '');
    if (s.enabled) {
      const r = await callFn<{ records: VisitorIntentRecord[] }>('visitor-intent', { op: 'list_records', workspace_id: wsId });
      setRecords(r.records || []);
    } else {
      setRecords([]);
    }
  }, [wsId]);

  useEffect(() => { void load(); }, [load]);

  async function act(label: string, fn: () => Promise<unknown>) {
    setBusy(label); setError(null);
    try { await fn(); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : `${label} failed`); }
    finally { setBusy(null); }
  }

  const snippet = `<script>
(function () {
  var key = localStorage.getItem('seerist_vid') ||
    (crypto.randomUUID && crypto.randomUUID()) || String(Date.now());
  localStorage.setItem('seerist_vid', key);
  // Pass the consent decision your OWN cookie banner collected.
  var consent = window.__consentGranted ? 'granted' : 'unknown';
  fetch('${INSFORGE_URL}/functions/visitor-intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      op: 'record_visit',
      workspace_id: '${wsId}',
      visitor_key: key,
      consent: consent,
      pages: [location.pathname],
      referrer: document.referrer || null,
      utm: Object.fromEntries(new URLSearchParams(location.search))
    })
  });
})();
</script>`;

  if (!settings) {
    return <div className="row"><span className="spinner" /> <span className="muted">Loading…</span></div>;
  }

  return (
    <>
      {error && <div className="error-box mb">{error}</div>}

      <div className="card" style={{ borderColor: settings.enabled ? 'var(--green-border)' : 'var(--amber-border)' }}>
        <div className="spread">
          <h3 style={{ marginBottom: 0 }}>Visitor identification</h3>
          <span className={`badge ${settings.enabled ? 'green' : 'amber'}`}>{settings.enabled ? 'enabled' : 'off'}</span>
        </div>
        <div className="warn-box mt">{settings.disclosure}</div>

        {settings.enabled ? (
          <>
            <p className="muted mt">
              Declared jurisdiction <strong>{settings.jurisdiction}</strong>, disclosure published at{' '}
              <a href={settings.policy_url || '#'} target="_blank" rel="noreferrer">{settings.policy_url}</a>
              {settings.consent_configured_at ? ` (configured ${new Date(settings.consent_configured_at).toLocaleDateString()})` : ''}.
            </p>
            <div className="row mt">
              <button className="btn danger sm" disabled={!!busy}
                onClick={() => act('disable', () => callFn('visitor-intent', { op: 'disable_tracking', workspace_id: wsId }))}>
                Turn off visitor identification
              </button>
              <button className="btn sm" disabled={!!busy}
                onClick={() => act('score', () => callFn('visitor-intent', { op: 'score_visitors', workspace_id: wsId }))}>
                {busy === 'score' ? <span className="spinner" /> : 'Score unscored visitors'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="grid cols-2 mt">
              <input type="text" value={jurisdiction} onChange={(e) => setJurisdiction(e.target.value)}
                placeholder='Privacy regime, e.g. "EU/GDPR" or "California/CCPA"' />
              <input type="url" value={policyUrl} onChange={(e) => setPolicyUrl(e.target.value)}
                placeholder="https://yourproduct.com/privacy" />
            </div>
            <label className="row mt" style={{ gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} style={{ width: 'auto' }} />
              <span className="muted">
                I confirm my privacy policy discloses visitor identification and my site collects consent before sending records.
              </span>
            </label>
            <button className="btn primary mt" disabled={!!busy || !acknowledged || !jurisdiction.trim() || !policyUrl.trim()}
              onClick={() => act('enable', () => callFn('visitor-intent', {
                op: 'enable_tracking', workspace_id: wsId, jurisdiction, policy_url: policyUrl,
              }))}>
              {busy === 'enable' ? <span className="spinner" /> : 'Enable visitor identification'}
            </button>
          </>
        )}
      </div>

      {settings.enabled && (
        <div className="card mt">
          <h3>Install the tracker</h3>
          <p className="muted">Add this to your site. Wire <code>window.__consentGranted</code> to your own cookie banner — a visitor who declines is never stored, and one whose consent is unknown is stored without any identity enrichment.</p>
          <pre className="mt">{snippet}</pre>
        </div>
      )}

      <div className="card mt">
        <div className="spread">
          <h3 style={{ marginBottom: 0 }}>Scored visitors</h3>
          <span className="badge gray">{settings.records} record(s)</span>
        </div>
        {!settings.enabled ? (
          <p className="faint mt">Enable visitor identification above to start collecting records.</p>
        ) : !records.length ? (
          <p className="faint mt">No visitor records yet. Install the tracker and traffic will appear here.</p>
        ) : (
          <table className="data mt">
            <thead><tr><th>Visitor</th><th>Intent</th><th>Why</th><th>Pages</th><th>Consent</th><th>Last seen</th></tr></thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id}>
                  <td><code style={{ fontSize: 11 }}>{r.visitor_key.slice(0, 12)}</code>{r.company ? <div className="faint">{r.company}</div> : null}</td>
                  <td>
                    {r.intent_score === null
                      ? <span className="badge gray">unscored</span>
                      : <span className={`score-pill ${r.intent_score >= 70 ? 'score-high' : r.intent_score >= 40 ? 'score-mid' : 'score-low'}`}>{r.intent_score}</span>}
                  </td>
                  <td className="muted" style={{ maxWidth: 320 }}>{r.intent_reasoning || '—'}</td>
                  <td className="faint">{(r.signals?.pages || []).length}</td>
                  <td>
                    <span className={`badge ${r.consent_status === 'granted' ? 'green' : r.consent_status === 'denied' ? 'red' : 'gray'}`}>
                      {r.consent_status}
                    </span>
                    {r.jurisdiction ? <div className="faint">{r.jurisdiction}</div> : null}
                  </td>
                  <td className="faint" style={{ whiteSpace: 'nowrap' }}>{new Date(r.last_seen_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
