// Seerist Capture — popup UI (sign in, workspace picker, offline queue sync).

const app = document.getElementById('app');
const send = (msg) => new Promise((resolve) => chrome.runtime.sendMessage(msg, resolve));

function h(html) { app.innerHTML = html; }

async function render() {
  const state = await send({ type: 'STATE' });
  if (!state?.signedIn) return renderSignIn();
  return renderSignedIn(state);
}

function renderSignIn(error) {
  h(`
    <label>Email</label>
    <input id="email" type="email" placeholder="you@company.com" />
    <label>Password</label>
    <input id="password" type="password" placeholder="••••••••" />
    ${error ? `<div class="err">${error}</div>` : ''}
    <button id="signin">Sign in to Seerist</button>
  `);
  document.getElementById('signin').addEventListener('click', async () => {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const res = await send({ type: 'SIGN_IN', email, password });
    if (!res?.ok) return renderSignIn(res?.error || 'Sign in failed');
    render();
  });
}

async function renderSignedIn(state) {
  const wsRes = await send({ type: 'WORKSPACES' });
  const workspaces = wsRes?.ok ? wsRes.workspaces : [];
  h(`
    <div class="ok">Signed in as ${state.email}</div>
    <label>Capture into workspace</label>
    <select id="ws">
      ${workspaces.map((w) => `<option value="${w.id}" ${w.id === state.workspaceId ? 'selected' : ''}>${w.name} (${w.type})${w.bidding_enabled ? '' : ' — bidding disabled'}</option>`).join('')}
    </select>
    ${!workspaces.length ? '<div class="err">No workspaces — create one in the Seerist web app first.</div>' : ''}
    <div class="stat">${state.queued ? `${state.queued} capture(s) queued offline.` : 'Offline queue is empty.'}</div>
    <div class="row">
      <button id="sync" class="secondary">Sync queue</button>
      <button id="signout" class="secondary">Sign out</button>
    </div>
    <div id="msg"></div>
  `);
  const ws = document.getElementById('ws');
  if (state.workspaceId === null && workspaces[0]) {
    await send({ type: 'SET_WORKSPACE', workspaceId: workspaces[0].id });
  }
  ws.addEventListener('change', async () => { await send({ type: 'SET_WORKSPACE', workspaceId: ws.value }); });
  document.getElementById('sync').addEventListener('click', async () => {
    const res = await send({ type: 'SYNC_QUEUE' });
    document.getElementById('msg').innerHTML = res?.ok
      ? `<div class="ok">Synced ${res.synced}; ${res.remaining} still queued.</div>`
      : `<div class="err">${res?.error || 'Sync failed'}</div>`;
  });
  document.getElementById('signout').addEventListener('click', async () => { await send({ type: 'SIGN_OUT' }); render(); });
}

render();
