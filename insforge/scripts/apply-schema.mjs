#!/usr/bin/env node
/**
 * Apply insforge/schema.sql to the linked InsForge project.
 *
 * Usage:
 *   INSFORGE_BASE_URL=https://<project>.insforge.app \
 *   INSFORGE_API_KEY=ik_xxx \
 *   node insforge/scripts/apply-schema.mjs [path/to/schema.sql]
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const baseUrl = process.env.INSFORGE_BASE_URL;
const apiKey = process.env.INSFORGE_API_KEY;
if (!baseUrl || !apiKey) {
  console.error('Set INSFORGE_BASE_URL and INSFORGE_API_KEY');
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
const sqlPath = process.argv[2] || resolve(here, '..', 'schema.sql');
const query = readFileSync(sqlPath, 'utf8');

// /rawsql runs as project_admin; /rawsql/unrestricted is the owner-privilege
// fallback for statements project_admin cannot run (e.g. SECURITY DEFINER fns).
async function run(path) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

let result = await run('/api/database/advance/rawsql');
if (!result.ok) {
  console.warn('project_admin apply failed, retrying unrestricted:', JSON.stringify(result.body).slice(0, 400));
  result = await run('/api/database/advance/rawsql/unrestricted');
}

if (!result.ok) {
  console.error('Schema apply FAILED:', result.status, JSON.stringify(result.body, null, 2));
  process.exit(1);
}
console.log('Schema applied:', JSON.stringify(result.body).slice(0, 400));
