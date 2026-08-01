#!/usr/bin/env node
/**
 * Typecheck the InsForge edge functions the way they are actually deployed.
 *
 * Each function is a single self-contained file: deploy-functions.mjs replaces
 * the `// @include _shared` marker with the contents of functions/_shared.ts
 * before uploading. Checking the raw sources would therefore miss every error
 * that only appears after inlining, so this script performs the same inlining
 * into a temp directory and runs tsc over the result.
 *
 * Usage: node scripts/typecheck-functions.mjs
 */
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');
const fnDir = resolve(repoRoot, 'insforge', 'functions');

const shared = readFileSync(resolve(fnDir, '_shared.ts'), 'utf8');
const files = readdirSync(fnDir).filter((f) => f.endsWith('.ts') && !f.startsWith('_'));

const work = mkdtempSync(resolve(tmpdir(), 'seerist-fncheck-'));
const src = resolve(work, 'src');
spawnSync('mkdir', ['-p', src]);

for (const file of files) {
  const source = readFileSync(resolve(fnDir, file), 'utf8');
  writeFileSync(resolve(src, file), source.replace(/^\/\/ @include _shared\s*$/m, shared));
}

// Edge functions run on Deno; stub the only Deno global they use.
writeFileSync(
  resolve(src, 'deno.d.ts'),
  'declare const Deno: { env: { get(key: string): string | undefined } };\n',
);
writeFileSync(resolve(work, 'tsconfig.json'), JSON.stringify({
  compilerOptions: {
    target: 'ES2022',
    lib: ['ES2022', 'DOM'],
    module: 'ESNext',
    moduleResolution: 'bundler',
    moduleDetection: 'force',
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    noFallthroughCasesInSwitch: true,
  },
  include: ['src'],
}, null, 2));

const tsc = resolve(repoRoot, 'web', 'node_modules', '.bin', 'tsc');
const result = spawnSync(tsc, ['-p', work], { stdio: 'inherit' });
rmSync(work, { recursive: true, force: true });

if (result.status !== 0) {
  console.error(`\n${files.length} edge function(s) failed typecheck.`);
  process.exit(result.status ?? 1);
}
console.log(`${files.length} edge function(s) typecheck clean (inlined exactly as deployed).`);
