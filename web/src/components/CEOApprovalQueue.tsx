import { useCallback, useEffect, useRef, useState } from 'react';
import { callFn, db, insforge } from '../lib/insforge';
import { useApp } from '../state/AppContext';
import type { CeoApprovalItem } from '../lib/types';
import { Icon } from './Icon';

/**
 * The CEO's approval queue. Every action the CEO persona is not allowed to take
 * on its own authority parks here until a human approves or rejects it —
 * approving is what executes it, rejecting discards it. Both decisions are
 * audited in persona_action_log.
 */

const ACTION_LABELS: Record<string, string> = {
  spend_money: 'Spend money',
  create_contract: 'Create a contract',
  delete_workspace: 'Delete a workspace',
  delete_organization: 'Delete the organization',
  archive_resource: 'Archive a resource',
  send_external_communication: 'Send an external communication',
  other: 'Unclassified action',
  // Pre-existing rows classified under the older names.
  monetary: 'Spend money',
  legal_commitment: 'Create a contract',
  external_communication: 'Send an external communication',
  destructive_change: 'Archive or delete a resource',
};

/** Refetch cadence when the realtime channel is unavailable. */
const POLL_MS = 20000;

interface Props {
  orgId: string;
  /** Org admins decide; everyone else sees the queue read-only. */
  canApprove: boolean;
  onPendingCountChange?: (count: number) => void;
  /** Bump to force a refetch — e.g. right after the CEO queues a new action. */
  refreshToken?: number;
}

export default function CEOApprovalQueue({ orgId, canApprove, onPendingCountChange, refreshToken = 0 }: Props) {
  const { user } = useApp();
  const [items, setItems] = useState<CeoApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const notify = useRef(onPendingCountChange);
  notify.current = onPendingCountChange;

  const load = useCallback(async () => {
    const { data, error: err } = await db()
      .from('ceo_approval_queue')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(100);
    if (err) { setError(err.message); return; }
    const rows = (data as CeoApprovalItem[]) || [];
    setItems(rows);
    setError(null);
    notify.current?.(rows.filter((i) => i.status === 'pending').length);
  }, [orgId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void load().finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [load, refreshToken]);

  // Realtime first, polling as the fallback. Realtime channels are configured
  // per project, so a workspace without the channel enabled must still work.
  useEffect(() => {
    const channel = `ceo-approvals:${orgId}`;
    let disposed = false;
    let poll: ReturnType<typeof setInterval> | undefined;

    const onMessage = (message: { meta?: { channel?: string } }) => {
      if (message?.meta?.channel && message.meta.channel !== channel) return;
      void load();
    };

    (async () => {
      try {
        const result = await insforge.realtime.subscribe(channel);
        if (disposed) { insforge.realtime.unsubscribe(channel); return; }
        if (result.ok) {
          insforge.realtime.on('ceo_approval_changed', onMessage);
          setLive(true);
          return;
        }
      } catch {
        // Fall through to polling.
      }
      if (!disposed) {
        setLive(false);
        poll = setInterval(() => void load(), POLL_MS);
      }
    })();

    return () => {
      disposed = true;
      if (poll) clearInterval(poll);
      insforge.realtime.off('ceo_approval_changed', onMessage);
      insforge.realtime.unsubscribe(channel);
      setLive(false);
    };
  }, [orgId, load]);

  async function decide(item: CeoApprovalItem, approve: boolean) {
    setBusy(item.id);
    setError(null);
    try {
      await callFn('ceo-command', approve
        ? { action: 'approve_action', queue_id: item.id, approved_by_user_id: user?.id }
        : { action: 'reject_action', queue_id: item.id, user_id: user?.id });
      await load();
      // Tell any other admin watching this org that the queue moved.
      try {
        await insforge.realtime.publish(`ceo-approvals:${orgId}`, 'ceo_approval_changed', {
          queue_id: item.id,
          status: approve ? 'approved' : 'rejected',
        });
      } catch { /* broadcast is a courtesy, not a requirement */ }
    } catch (e) {
      setError(e instanceof Error ? e.message : `Failed to ${approve ? 'approve' : 'reject'} the action`);
    } finally {
      setBusy(null);
    }
  }

  const pending = items.filter((i) => i.status === 'pending');
  const history = items.filter((i) => i.status !== 'pending');

  return (
    <div className="card mt" style={pending.length ? { borderColor: 'var(--amber-border)' } : undefined}>
      <div className="spread">
        <h3 style={{ marginBottom: 0 }}>
          ⏳ Approval queue
          {pending.length > 0 && <span className="badge amber" style={{ marginLeft: 8 }}>{pending.length} pending</span>}
        </h3>
        <div className="row">
          <span className={`badge ${live ? 'green' : 'gray'}`} title={live ? 'Live via realtime subscription' : 'Realtime unavailable — refreshing on a timer'}>
            {live ? '● live' : '○ polling'}
          </span>
          <button className="btn ghost sm" onClick={() => void load()}><Icon name="refresh" /></button>
        </div>
      </div>

      <p className="muted mt">
        Money, contracts, deletions, archiving and anything sent outside the org land here first. Approving is what executes the action; rejecting discards it. Both decisions are audited.
      </p>

      {error && <div className="error-box mt">{error}</div>}
      {!canApprove && (
        <div className="info-box mt">You can see this queue, but only organization owners and admins can approve or reject.</div>
      )}

      {loading ? (
        <div className="row mt"><span className="spinner" /> <span className="muted">Loading queue…</span></div>
      ) : !pending.length ? (
        <div className="success-box mt">Nothing waiting on you — the CEO has no pending actions.</div>
      ) : (
        <div className="stack mt">
          {pending.map((item) => (
            <div key={item.id} className="card" style={{ background: 'var(--bg-raise)' }}>
              <div className="spread">
                <div className="row">
                  <span className="badge amber">{ACTION_LABELS[item.action_type] || item.action_type}</span>
                  <span className="badge gray">{item.requested_by_persona}</span>
                </div>
                <span className="faint">{new Date(item.created_at).toLocaleString()}</span>
              </div>
              <p className="mt" style={{ marginBottom: 0 }}>
                {item.action_payload?.description || item.action_payload?.plan || item.action_payload?.instruction || 'No description recorded.'}
              </p>
              {item.action_payload?.instruction && item.action_payload?.description !== item.action_payload?.instruction && (
                <p className="faint" style={{ marginTop: 6 }}>Requested: “{item.action_payload.instruction}”</p>
              )}
              <div className="row mt">
                <button className="btn success sm" disabled={!canApprove || busy === item.id}
                  onClick={() => void decide(item, true)}>
                  {busy === item.id ? <span className="spinner" /> : <><Icon name="check" /> Approve &amp; execute</>}
                </button>
                <button className="btn danger sm" disabled={!canApprove || busy === item.id}
                  onClick={() => void decide(item, false)}>
                  <Icon name="close" /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {history.length > 0 && (
        <>
          <hr className="divider" />
          <h3>Decision history</h3>
          <table className="data">
            <thead><tr><th>Decided</th><th>Action</th><th>Outcome</th><th>Result</th></tr></thead>
            <tbody>
              {history.map((item) => (
                <tr key={item.id}>
                  <td className="faint" style={{ whiteSpace: 'nowrap' }}>
                    {new Date(item.approved_by_at || item.created_at).toLocaleString()}
                  </td>
                  <td>{ACTION_LABELS[item.action_type] || item.action_type}</td>
                  <td>
                    <span className={`badge ${item.status === 'approved' ? 'green' : 'red'}`}>{item.status}</span>
                  </td>
                  <td className="muted" style={{ maxWidth: 420 }}>
                    {expanded === item.id
                      ? <pre style={{ marginTop: 0 }}>{item.result || '—'}</pre>
                      : (item.result || '—').slice(0, 140)}
                    {(item.result || '').length > 140 && (
                      <button className="btn ghost sm" style={{ marginLeft: 6 }}
                        onClick={() => setExpanded(expanded === item.id ? null : item.id)}>
                        {expanded === item.id ? 'Less' : 'More'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
