// ============================================================================
// Seerist Capture — background service worker.
// Owns auth (email/password against the Seerist InsForge backend), the
// offline capture queue (chrome.storage.local), and all network calls.
// The extension must work WITHOUT the API being reachable: captures queue
// locally and sync when connectivity returns.
// ============================================================================

const DEFAULT_BASE = 'https://si9f4zab.eu-central.insforge.app';

async function getState() {
  const s = await chrome.storage.local.get(['baseUrl', 'accessToken', 'workspaceId', 'email', 'queue']);
  return {
    baseUrl: s.baseUrl || DEFAULT_BASE,
    accessToken: s.accessToken || null,
    workspaceId: s.workspaceId || null,
    email: s.email || null,
    queue: Array.isArray(s.queue) ? s.queue : [],
  };
}

async function signIn(email, password) {
  const { baseUrl } = await getState();
  const res = await fetch(`${baseUrl}/api/auth/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.accessToken) {
    throw new Error(data.message || data.error || 'Sign in failed');
  }
  await chrome.storage.local.set({ accessToken: data.accessToken, email });
  return { email };
}

async function listWorkspaces() {
  const { baseUrl, accessToken } = await getState();
  if (!accessToken) throw new Error('Not signed in');
  const res = await fetch(`${baseUrl}/api/database/records/workspaces?select=id,name,type,bidding_enabled&order=created_at.asc&limit=50`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (res.status === 401) throw new Error('Session expired — sign in again');
  if (!res.ok) throw new Error(`Failed to load workspaces (${res.status})`);
  return await res.json();
}

async function fetchApprovedProposals() {
  const { baseUrl, accessToken, workspaceId } = await getState();
  if (!accessToken) throw new Error('Not signed in');
  if (!workspaceId) throw new Error('Pick a workspace in the extension popup first');
  const res = await fetch(
    `${baseUrl}/api/database/records/proposals?workspace_id=eq.${workspaceId}&status=eq.approved&select=id,draft_content,job_posting_id&order=updated_at.desc&limit=10`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (res.status === 401) throw new Error('Session expired — sign in again');
  if (!res.ok) throw new Error(`Failed to load approved proposals (${res.status})`);
  const proposals = await res.json();
  // Attach job titles for the picker.
  const out = [];
  for (const p of proposals) {
    let title = 'Approved proposal';
    try {
      const jres = await fetch(`${baseUrl}/api/database/records/job_postings?id=eq.${p.job_posting_id}&select=title&limit=1`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const jobs = await jres.json();
      if (jobs[0]?.title) title = jobs[0].title;
    } catch { /* keep default */ }
    out.push({ id: p.id, title, draft: p.draft_content || '' });
  }
  return out;
}

async function sendCapture(job) {
  const { baseUrl, accessToken, workspaceId } = await getState();
  if (!accessToken || !workspaceId) throw new Error('AUTH');
  const res = await fetch(`${baseUrl}/functions/capture-job`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...job, workspace_id: workspaceId, source: 'extension_capture' }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Capture failed (${res.status})`);
  return data;
}

async function queueCapture(job) {
  const { queue } = await getState();
  queue.push({ ...job, queued_at: new Date().toISOString() });
  await chrome.storage.local.set({ queue });
  return queue.length;
}

async function syncQueue() {
  const { queue } = await getState();
  if (!queue.length) return { synced: 0, remaining: 0 };
  const remaining = [];
  let synced = 0;
  for (const job of queue) {
    try {
      await sendCapture(job);
      synced++;
    } catch {
      remaining.push(job);
    }
  }
  await chrome.storage.local.set({ queue: remaining });
  return { synced, remaining: remaining.length };
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    try {
      switch (msg.type) {
        case 'STATE': {
          const s = await getState();
          sendResponse({ ok: true, signedIn: !!s.accessToken, email: s.email, workspaceId: s.workspaceId, queued: s.queue.length });
          break;
        }
        case 'SIGN_IN':
          sendResponse({ ok: true, ...(await signIn(msg.email, msg.password)) });
          break;
        case 'SIGN_OUT':
          await chrome.storage.local.remove(['accessToken', 'email']);
          sendResponse({ ok: true });
          break;
        case 'WORKSPACES':
          sendResponse({ ok: true, workspaces: await listWorkspaces() });
          break;
        case 'SET_WORKSPACE':
          await chrome.storage.local.set({ workspaceId: msg.workspaceId });
          sendResponse({ ok: true });
          break;
        case 'CAPTURE': {
          try {
            const data = await sendCapture(msg.job);
            sendResponse({ ok: true, captured: true, proposalId: data.proposal?.id });
          } catch (e) {
            // Offline resilience: queue locally, sync later.
            if (e.message === 'AUTH') {
              sendResponse({ ok: false, error: 'Sign in and pick a workspace in the Seerist popup first.' });
            } else {
              const n = await queueCapture(msg.job);
              sendResponse({ ok: true, captured: false, queued: n, note: 'API unreachable — capture stored locally and will sync automatically.' });
            }
          }
          break;
        }
        case 'SYNC_QUEUE':
          sendResponse({ ok: true, ...(await syncQueue()) });
          break;
        case 'APPROVED_PROPOSALS':
          sendResponse({ ok: true, proposals: await fetchApprovedProposals() });
          break;
        default:
          sendResponse({ ok: false, error: `Unknown message ${msg.type}` });
      }
    } catch (e) {
      sendResponse({ ok: false, error: e.message || String(e) });
    }
  })();
  return true; // async response
});

// Try to flush the offline queue whenever the worker wakes up.
chrome.runtime.onStartup?.addListener(() => { syncQueue(); });
syncQueue();
