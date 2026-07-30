#!/usr/bin/env node
/**
 * Deploy all Seerist edge functions to the linked InsForge project.
 * Inlines functions/_shared.ts into each function (functions are single-file),
 * then creates (POST /api/functions) or updates (PUT /api/functions/:slug).
 *
 * Usage:
 *   INSFORGE_BASE_URL=... INSFORGE_API_KEY=ik_... node insforge/scripts/deploy-functions.mjs [slug ...]
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const baseUrl = process.env.INSFORGE_BASE_URL;
const apiKey = process.env.INSFORGE_API_KEY;
if (!baseUrl || !apiKey) {
  console.error('Set INSFORGE_BASE_URL and INSFORGE_API_KEY');
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
const fnDir = resolve(here, '..', 'functions');
const shared = readFileSync(resolve(fnDir, '_shared.ts'), 'utf8');

const only = process.argv.slice(2);
const files = readdirSync(fnDir)
  .filter((f) => f.endsWith('.ts') && !f.startsWith('_'))
  .filter((f) => !only.length || only.includes(basename(f, '.ts')));

const headers = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;

async function deployOne(slug, code) {
  const payload = { name: slug, slug, code, status: 'active', description: `Seerist ${slug}` };
  for (let attempt = 1; attempt <= 6; attempt++) {
    let res = await fetch(`${baseUrl}/api/functions/${slug}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ code, status: 'active', description: payload.description }),
    });
    if (res.status === 404) {
      res = await fetch(`${baseUrl}/api/functions`, { method: 'POST', headers, body: JSON.stringify(payload) });
    }
    const data = await res.json().catch(() => ({}));
    const ok = res.ok && (data.success === undefined || data.success);
    if (ok) return { ok, status: res.status };
    if (res.status === 429 || res.status === 504) {
      const wait = res.status === 429 ? 65000 : 10000;
      console.log(`  ${slug}: ${res.status}, retrying in ${wait / 1000}s (attempt ${attempt}/6)`);
      await sleep(wait);
      continue;
    }
    return { ok: false, status: res.status, detail: JSON.stringify(data).slice(0, 300) };
  }
  return { ok: false, status: 429, detail: 'rate limit persisted after retries' };
}

for (const file of files) {
  const slug = basename(file, '.ts');
  const source = readFileSync(resolve(fnDir, file), 'utf8');
  const code = source.replace(/^\/\/ @include _shared\s*$/m, shared);
  const result = await deployOne(slug, code);
  console.log(`${result.ok ? 'OK ' : 'ERR'} ${slug} (${result.status})${result.ok ? '' : ' ' + (result.detail || '')}`);
  if (!result.ok) failures++;
  await sleep(1500);
}

if (failures) {
  console.error(`${failures} function(s) failed to deploy`);
  process.exit(1);
}
console.log(`Deployed ${files.length} function(s).`);
