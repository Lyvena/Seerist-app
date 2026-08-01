import { useCallback, useEffect, useState } from 'react';
import { callFn, db } from '../lib/insforge';
import type { AutomationRun, Workspace } from '../lib/types';
import { Icon } from './Icon';
import { CopyRow, EmptyState, SectionHead, Toggle } from './UI';

/**
 * Automation — what Seerist does while nobody is watching.
 *
 * Two halves. Intake is how work reaches Seerist without anyone opening a job
 * page: forward the platform alert emails you already get. The heartbeat is the
 * scheduled side — scanning, follow-up nudges, the weekly digest.
 *
 * The pause switch is deliberately the first control on the panel. Autonomy
 * nobody can stop is a liability, not a feature.
 */

const INTAKE_DOMAIN = 'inbound.seerist.xyz';

const JOBS: Array<{ id: string; name: string; icon: Parameters<typeof Icon>[0]['name']; what: string; when: string }> = [
  { id: 'scan', name: 'Scan & score', icon: 'radar', what: 'Scores whatever arrived and alerts you about the ones worth bidding on.', when: 'Every 15 minutes' },
  { id: 'nudge', name: 'Follow-up nudges', icon: 'bell', what: 'A bid that was read but never answered is a warm lead going cold. Seerist tells you — it never messages the client.', when: 'Daily' },
  { id: 'digest', name: 'The PM digest', icon: 'clipboard', what: 'The weekly read on what is working, delivered instead of waited for.', when: 'Mondays' },
  { id: 'grower', name: 'Growth recommendations', icon: 'growth', what: 'The Grower drafts its weekly recommendations. Drafts only — nothing is published.', when: 'Weekly' },
  { id: 'stale', name: 'Stalled work', icon: 'clock', what: 'Flags delivery runs that have stopped moving, especially ones waiting on your QA.', when: 'Daily' },
];

const CHANNELS = [
  { value: '', label: 'No alerts — I will check the app' },
  { value: 'slack', label: 'Slack' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'discord', label: 'Discord' },
  { value: 'gmail', label: 'Email (Gmail)' },
];

export default function AutomationPanel({ ws, onSaved }: { ws: Workspace; onSaved: () => void }) {
  const [runs, setRuns] = useState<AutomationRun[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [channel, setChannel] = useState(ws.alert_channel || '');
  const [target, setTarget] = useState(ws.alert_target || '');
  const [minScore, setMinScore] = useState(ws.alert_min_score ?? 75);
  const [paste, setPaste] = useState('');

  const loadRuns = useCallback(async () => {
    const { data } = await db()
      .from('automation_runs')
      .select('*')
      .eq('workspace_id', ws.id)
      .order('created_at', { ascending: false })
      .limit(12);
    setRuns((data as AutomationRun[]) || []);
  }, [ws.id]);

  useEffect(() => { void loadRuns(); }, [loadRuns]);

  const act = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key); setError(''); setNote('');
    try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    setBusy(null);
  };

  const saveField = async (patch: Partial<Workspace>) => {
    const { error: err } = await db().from('workspaces').update(patch).eq('id', ws.id);
    if (err) throw new Error(err.message);
    onSaved();
  };

  const intakeAddress = ws.intake_token ? `jobs+${ws.intake_token}@${INTAKE_DOMAIN}` : null;
  const paused = ws.automation_enabled === false;

  return (
    <div>
      <SectionHead
        icon="bolt"
        title="Automation"
        hint="What Seerist does between your visits. Everything here can be switched off in one click."
      />

      {error ? <div className="error-box mb"><Icon name="alert" /><span>{error}</span></div> : null}
      {note ? <div className="success-box mb"><Icon name="check" /><span>{note}</span></div> : null}

      <div className="card">
        <div className="spread">
          <div>
            <h3 className="row" style={{ gap: 8 }}>
              {paused ? <Icon name="pause" /> : <span className="dot-live" />}
              {paused ? 'Automation is paused' : 'Automation is running'}
            </h3>
            <p className="muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
              {paused
                ? 'Nothing runs on a schedule for this workspace. You can still run any job by hand below.'
                : 'Seerist scores new work, watches for bids going cold, and sends you the weekly read.'}
            </p>
          </div>
          <Toggle
            checked={!paused}
            disabled={busy === 'pause'}
            onChange={(next) => act('pause', () => saveField({ automation_enabled: next }))}
          />
        </div>
      </div>

      {/* --- Intake ---------------------------------------------------------- */}
      <div className="card">
        <h3 className="row" style={{ gap: 8 }}><Icon name="mail" /> Job intake by email</h3>
        <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
          Seerist used to need you to open a job page before it could see the job — which is no help
          when the problem is finding out too late. Forward the job-alert emails the platforms
          already send you and they land in your Pitch Queue, scored, before you have read them.
        </p>
        {intakeAddress ? (
          <>
            <CopyRow value={intakeAddress} label="This workspace's intake address" />
            <div className="info-box mt">
              <Icon name="info" />
              <div>
                <b>Set it up once:</b> in your mail client, add a rule that forwards messages from
                <code>upwork.com</code>, <code>fiverr.com</code>, <code>freelancer.com</code> or
                <code>toptal.com</code> to the address above. Jobs you already captured are
                recognised and never duplicated.
              </div>
            </div>
          </>
        ) : (
          <div className="warn-box"><Icon name="alert" /><span>No intake address yet — save the workspace once and it will be generated.</span></div>
        )}

        <div className="field mt">
          <label>Or paste one now</label>
          <textarea
            placeholder="Paste the full text of a job-alert email to try it…"
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            style={{ minHeight: 90 }}
          />
          <div className="help">Useful for checking it works before you set the forwarding rule up.</div>
        </div>
        <button
          className="btn"
          disabled={busy === 'paste' || paste.trim().length < 40}
          onClick={() => act('paste', async () => {
            const res = await callFn('ingest-job-email', {
              workspace_id: ws.id,
              subject: 'Pasted job alert',
              text: paste,
            });
            const r = res as { ingested: number; duplicates: number; detail?: string };
            setNote(r.ingested
              ? `Found ${r.ingested} job${r.ingested === 1 ? '' : 's'}${r.duplicates ? `, skipped ${r.duplicates} already in your queue` : ''}. They are in the Pitch Queue.`
              : r.detail || 'No new jobs found in that email.');
            setPaste('');
          })}
        >
          {busy === 'paste' ? <span className="spinner" /> : <Icon name="send" />} Read this email
        </button>
      </div>

      {/* --- Alerts ---------------------------------------------------------- */}
      <div className="card">
        <h3 className="row" style={{ gap: 8 }}><Icon name="bell" /> Where alerts go</h3>
        <div className="grid cols-2">
          <div className="field">
            <label>Channel</label>
            <select value={channel} onChange={(e) => setChannel(e.target.value)}>
              {CHANNELS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <div className="help">Connect the service first in Settings → Integrations.</div>
          </div>
          <div className="field">
            <label>Where exactly</label>
            <input
              type="text"
              value={target}
              placeholder={channel === 'slack' ? '#new-work' : channel === 'gmail' ? 'you@company.com' : 'chat or channel id'}
              onChange={(e) => setTarget(e.target.value)}
              disabled={!channel}
            />
          </div>
        </div>
        <div className="field">
          <label>Only tell me about jobs scoring {minScore} or above</label>
          <input
            type="range" min={0} max={100} step={5}
            value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value))}
          />
          <div className="help">
            Higher means fewer, better alerts. 75 is a good starting point until your own win data
            tells you otherwise.
          </div>
        </div>
        <button
          className="btn primary"
          disabled={busy === 'alerts'}
          onClick={() => act('alerts', async () => {
            await saveField({ alert_channel: channel || null, alert_target: target || null, alert_min_score: minScore });
            setNote('Alert settings saved.');
          })}
        >
          {busy === 'alerts' ? <span className="spinner" /> : <Icon name="check" />} Save alert settings
        </button>
      </div>

      {/* --- The jobs -------------------------------------------------------- */}
      <div className="card">
        <h3 className="row" style={{ gap: 8 }}><Icon name="clock" /> Scheduled jobs</h3>
        <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
          Each of these runs on its own schedule. Run one now to see exactly what it would do.
        </p>
        <table className="data">
          <thead>
            <tr><th>Job</th><th>What it does</th><th>Runs</th><th /></tr>
          </thead>
          <tbody>
            {JOBS.map((j) => (
              <tr key={j.id}>
                <td>
                  <span className="row" style={{ gap: 7, fontWeight: 600 }}>
                    <Icon name={j.icon} /> {j.name}
                  </span>
                </td>
                <td className="muted">{j.what}</td>
                <td><span className="badge gray">{j.when}</span></td>
                <td style={{ textAlign: 'right' }}>
                  <button
                    className="btn sm"
                    disabled={!!busy}
                    onClick={() => act(j.id, async () => {
                      const res = await callFn('automation-tick', { job: j.id, workspace_id: ws.id }) as
                        { results?: Array<{ status: string; detail: string }> };
                      const r = res.results?.[0];
                      setNote(`${j.name}: ${r?.detail || 'done'}`);
                      await loadRuns();
                    })}
                  >
                    {busy === j.id ? <span className="spinner" /> : <Icon name="play" />} Run now
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* --- History --------------------------------------------------------- */}
      <div className="card">
        <div className="spread mb">
          <h3 className="row" style={{ gap: 8 }}><Icon name="clipboard" /> Recent runs</h3>
          <button className="btn sm ghost" onClick={() => void loadRuns()}><Icon name="refresh" /> Refresh</button>
        </div>
        {runs.length ? (
          <table className="data">
            <thead><tr><th>When</th><th>Job</th><th>Result</th><th>Items</th></tr></thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id}>
                  <td className="nowrap faint">{new Date(r.created_at).toLocaleString()}</td>
                  <td><code>{r.job}</code></td>
                  <td>
                    <span className={`badge ${r.status === 'ok' ? 'green' : r.status === 'failed' ? 'red' : 'gray'}`}>
                      {r.status}
                    </span>{' '}
                    <span className="muted">{r.detail}</span>
                  </td>
                  <td>{r.items}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState art="radar" title="Nothing has run yet">
            Automation records every tick here — including the ones that found nothing to do, so a
            job that quietly stops running is visible rather than invisible.
          </EmptyState>
        )}
      </div>
    </div>
  );
}
