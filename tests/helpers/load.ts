import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';
import { transformSync } from 'esbuild';

export const repoRoot = resolve(__dirname, '..', '..');

export function readRepoFile(relative: string): string {
  return readFileSync(resolve(repoRoot, relative), 'utf8');
}

/**
 * Load `extension/content.js` into a JSDOM page and hand back its adapters.
 *
 * The content script is a classic (non-module) browser script, so it is
 * evaluated the same way Chrome would evaluate it rather than imported. The
 * `chrome` global is deliberately left undefined so the auto-start guard keeps
 * the MutationObserver from running during tests.
 */
export function loadExtensionAdapters(html: string, url: string) {
  const dom = new JSDOM(html, { url, pretendToBeVisual: true });
  const source = readRepoFile('extension/content.js');
  const moduleShim: { exports: Record<string, any> } = { exports: {} };

  const run = new Function('window', 'document', 'location', 'module', 'MutationObserver', `
    with (window) {
      ${source}
    }
  `);
  run(dom.window, dom.window.document, dom.window.location, moduleShim, dom.window.MutationObserver);

  return { dom, ...(moduleShim.exports as {
    ADAPTERS: any[];
    currentAdapter: () => any;
    scrapeJob: (adapter: any) => any;
  }) };
}

/**
 * Evaluate the plain function declarations in `insforge/functions/_shared.ts`.
 *
 * These helpers are inlined into every edge function at deploy time rather than
 * exported, so the file is stripped of types and evaluated with a `Deno` stub
 * to get at the pure logic. That is the only way to test the real shipped code
 * instead of a copy of it.
 */
export function loadSharedHelpers(): Record<string, any> {
  const ts = readRepoFile('insforge/functions/_shared.ts');
  const js = transformSync(ts, { loader: 'ts', format: 'cjs', target: 'es2022' }).code;

  const names = [
    'isZeroCost', 'isChatModel', 'versionKey', 'compareVersions',
    'freeModelCeiling', 'withinFreeCeiling', 'parseJsonLoose',
  ];
  const factory = new Function('Deno', 'exports', `
    ${js}
    ${names.map((n) => `try { exports.${n} = ${n}; } catch (e) {}`).join('\n')}
    return exports;
  `);
  return factory({ env: { get: () => undefined } }, {});
}
