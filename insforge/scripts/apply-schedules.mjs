#!/usr/bin/env node
/**
 * Register (or re-register) Seerist's scheduled jobs on the linked InsForge
 * project.
 *
 * Schedules are the heartbeat: without them every AI employee only works while
 * somebody holds its button. They are defined here as code so the set is
 * reproducible and reviewable, rather than clicked into a dashboard once and
 * forgotten.
 *
 * The AUTOMATION_TOKEN project secret is referenced, never inlined — InsForge
 * resolves `${{secrets.KEY}}` at creation time and stores it encrypted.
 *
 * Usage:
 *   INSFORGE_BASE_URL=https://<project>.insforge.app \
 *   INSFORGE_API_KEY=ik_xxx \
 *   node insforge/scripts/apply-schedules.mjs [--list] [--delete]
 */

const baseUrl = process.env.INSFORGE_BASE_URL;
const apiKey = process.env.INSFORGE_API_KEY;
if (!baseUrl || !apiKey) {
  console.error('Set INSFORGE_BASE_URL and INSFORGE_API_KEY');
  process.exit(1);
}

/**
 * Cron times are deliberately off the hour. Every scheduled system in the world
 * fires at :00, and the model gateway is busiest exactly then.
 */
const SCHEDULES = [
  {
    name: 'seerist-scan',
    schedule: '*/15 * * * *',
    job: 'scan',
    what: 'Score newly arrived jobs and alert on the ones worth bidding on',
  },
  {
    name: 'seerist-nudge',
    schedule: '17 9 * * *',
    job: 'nudge',
    what: 'Flag bids that were viewed but never answered',
  },
  {
    name: 'seerist-digest',
    schedule: '23 8 * * 1',
    job: 'digest',
    what: "The PM's weekly synthesis, delivered",
  },
  {
    name: 'seerist-grower',
    schedule: '41 8 * * 1',
    job: 'grower',
    what: 'Weekly growth recommendations, as drafts',
  },
  {
    name: 'seerist-stale',
    schedule: '31 9 * * *',
    job: 'stale',
    what: 'Delivery runs that have stopped moving',
  },
];

async function api(path, init = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { ok: res.ok, status: res.status, data };
}

const existing = await api('/api/schedules');
if (!existing.ok) {
  console.error('Could not list schedules:', existing.status, JSON.stringify(existing.data).slice(0, 300));
  process.exit(1);
}
const rows = Array.isArray(existing.data) ? existing.data : (existing.data?.schedules ?? []);

if (process.argv.includes('--list')) {
  if (!rows.length) console.log('No schedules configured.');
  for (const r of rows) console.log(`${r.name}\t${r.schedule}\t${r.url ?? ''}`);
  process.exit(0);
}

if (process.argv.includes('--delete')) {
  for (const r of rows.filter((r) => String(r.name).startsWith('seerist-'))) {
    const del = await api(`/api/schedules/${r.id}`, { method: 'DELETE' });
    console.log(`${del.ok ? 'deleted' : 'FAILED'} ${r.name}`);
  }
  process.exit(0);
}

let failures = 0;
for (const s of SCHEDULES) {
  const url = `${baseUrl}/functions/automation-tick?job=${s.job}`;
  const payload = {
    name: s.name,
    schedule: s.schedule,
    url,
    // The token is a project secret; InsForge substitutes and encrypts it.
    headers: {
      Authorization: 'Bearer ${{secrets.AUTOMATION_TOKEN}}',
      'Content-Type': 'application/json',
      // A tick fires far less often than the 65s keep-alive window, so a reused
      // socket is always already closed server-side. A fresh one each time
      // avoids the ~30s stall documented for long-interval callers.
      Connection: 'close',
    },
  };

  const prior = rows.find((r) => r.name === s.name);
  const res = prior
    ? await api(`/api/schedules/${prior.id}`, { method: 'PATCH', body: JSON.stringify(payload) })
    : await api('/api/schedules', { method: 'POST', body: JSON.stringify(payload) });

  if (res.ok) {
    console.log(`${prior ? 'updated' : 'created'}  ${s.name.padEnd(18)} ${s.schedule.padEnd(14)} ${s.what}`);
  } else {
    failures += 1;
    console.error(`FAILED   ${s.name}: ${res.status} ${JSON.stringify(res.data).slice(0, 240)}`);
  }
}

console.log(failures ? `\n${failures} schedule(s) failed.` : `\nAll ${SCHEDULES.length} schedules are registered.`);
process.exit(failures ? 1 : 0);
