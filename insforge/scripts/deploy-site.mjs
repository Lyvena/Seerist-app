#!/usr/bin/env node
/**
 * Deploy the built web app (web/dist) to InsForge Sites via the
 * direct-upload deployment flow:
 *   1. POST /api/deployments/direct  { files: [{path, sha, size}] }
 *   2. PUT  /api/deployments/:id/files/:fileId/content   (octet-stream)
 *   3. POST /api/deployments/:id/start
 *   4. poll GET /api/deployments/:id until READY/ERROR
 *
 * Usage:
 *   INSFORGE_BASE_URL=... INSFORGE_API_KEY=ik_... node insforge/scripts/deploy-site.mjs
 */
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, relative, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const baseUrl = process.env.INSFORGE_BASE_URL;
const apiKey = process.env.INSFORGE_API_KEY;
if (!baseUrl || !apiKey) {
  console.error('Set INSFORGE_BASE_URL and INSFORGE_API_KEY');
  process.exit(1);
}
const headers = { Authorization: `Bearer ${apiKey}` };
const jsonHeaders = { ...headers, 'Content-Type': 'application/json' };

const here = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(here, '..', '..', 'web', 'dist');

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

const files = walk(distDir).map((full) => {
  const content = readFileSync(full);
  return {
    path: relative(distDir, full).split('\\').join('/'),
    sha: createHash('sha1').update(content).digest('hex'),
    size: content.length,
    content,
  };
});
console.log(`Deploying ${files.length} files from web/dist`);

// 1. Create the deployment with its manifest.
const createRes = await fetch(`${baseUrl}/api/deployments/direct`, {
  method: 'POST',
  headers: jsonHeaders,
  body: JSON.stringify({ files: files.map(({ path, sha, size }) => ({ path, sha, size })) }),
});
const created = await createRes.json();
if (!createRes.ok) {
  console.error('Create deployment failed:', createRes.status, JSON.stringify(created).slice(0, 500));
  process.exit(1);
}
const deploymentId = created.id;
console.log('Deployment created:', deploymentId);

// 2. Upload each file's content.
for (const manifestFile of created.files) {
  const local = files.find((f) => f.path === manifestFile.path);
  if (!local) continue;
  const res = await fetch(`${baseUrl}/api/deployments/${deploymentId}/files/${manifestFile.fileId}/content`, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/octet-stream' },
    body: local.content,
  });
  if (!res.ok) {
    console.error(`Upload failed for ${manifestFile.path}:`, res.status, await res.text());
    process.exit(1);
  }
  console.log('Uploaded', manifestFile.path);
}

// 3. Start the deployment (static files — no build step needed).
const startRes = await fetch(`${baseUrl}/api/deployments/${deploymentId}/start`, {
  method: 'POST',
  headers: jsonHeaders,
  body: JSON.stringify({ meta: { app: 'seerist-web' } }),
});
const started = await startRes.json();
if (!startRes.ok) {
  console.error('Start failed:', startRes.status, JSON.stringify(started).slice(0, 500));
  process.exit(1);
}
console.log('Deployment started:', started.status);

// 4. Poll for completion.
for (let i = 0; i < 60; i++) {
  await new Promise((r) => setTimeout(r, 5000));
  const res = await fetch(`${baseUrl}/api/deployments/${deploymentId}`, { headers });
  const dep = await res.json();
  const status = (dep.status || '').toUpperCase();
  console.log(`  [${i}] status=${status}${dep.url ? ` url=${dep.url}` : ''}`);
  if (['READY', 'SUCCESS', 'COMPLETED'].includes(status)) {
    console.log('DEPLOYED:', dep.url || dep.previewUrl || '(url pending)');
    process.exit(0);
  }
  if (['ERROR', 'FAILED', 'CANCELED'].includes(status)) {
    console.error('Deployment failed:', JSON.stringify(dep).slice(0, 800));
    process.exit(1);
  }
}
console.error('Timed out waiting for deployment');
process.exit(1);
