import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadFunctionScope, readRepoFile } from './helpers/load';

/**
 * The gateway serves whichever model ranks best today, so neither the reply
 * shape nor the reply length is fixed. Two things have to hold as models come
 * and go: the catalog must be readable at all, and a reply that runs out of
 * room must not surface to the user as a failure.
 */

const shared = readRepoFile('insforge/functions/_shared.ts');
const { aiJson } = loadFunctionScope('insforge/functions/_shared.ts', ['aiJson']);

const reply = (text: string) => ({ ok: true, json: async () => ({ text }) });
const messages = [{ role: 'user', content: 'go' }];

afterEach(() => { vi.unstubAllGlobals(); });

describe('the model catalog is readable', () => {
  it('is fetched with the service key, not the caller’s token', () => {
    // /api/ai/models is admin-only: a caller's JWT gets a 403, which silently
    // pins every tier to its hardcoded fallback and disables model selection.
    expect(shared).toMatch(/api\/ai\/models[\s\S]{0,160}SERVICE_KEY \|\| token/);
  });
});

describe('a truncated JSON reply is retried, not surfaced', () => {
  it('retries once and returns the parsed object', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(reply('{"tasks": ["one", "two", "thr'))
      .mockResolvedValueOnce(reply('{"tasks": ["one", "two"]}'));
    vi.stubGlobal('fetch', fetchMock);

    await expect(aiJson(messages, 'tok', { maxTokens: 800 })).resolves.toEqual({ tasks: ['one', 'two'] });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('gives the retry more room to finish', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(reply('{"a": "unclosed'))
      .mockResolvedValueOnce(reply('{"a": "ok"}'));
    vi.stubGlobal('fetch', fetchMock);

    await aiJson(messages, 'tok', { maxTokens: 300 });
    const budgets = fetchMock.mock.calls.map((c) => JSON.parse(c[1].body).maxTokens);
    expect(budgets[1]).toBeGreaterThan(budgets[0]);
    expect(budgets[1]).toBeLessThanOrEqual(4000);
  });

  it('tells the model why it is being asked again', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(reply('here you go: nothing parseable'))
      .mockResolvedValueOnce(reply('{"ok": true}'));
    vi.stubGlobal('fetch', fetchMock);

    await aiJson(messages, 'tok', {});
    const sent = JSON.parse(fetchMock.mock.calls[1][1].body).messages;
    expect(sent).toHaveLength(messages.length + 1);
    expect(sent.at(-1).content).toMatch(/could not be parsed as JSON/i);
  });

  it('does not retry a reply that parsed first time', async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply('{"fine": true}'));
    vi.stubGlobal('fetch', fetchMock);

    await expect(aiJson(messages, 'tok', {})).resolves.toEqual({ fine: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('still fails loudly when the retry is unparseable too', async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply('no json here either'));
    vi.stubGlobal('fetch', fetchMock);

    await expect(aiJson(messages, 'tok', {})).rejects.toThrow(/did not return valid JSON/);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('free-tier defaults are picked for the request budget', () => {
  const schema = readRepoFile('insforge/schema.sql');
  const rank = (pattern: string) => {
    const m = schema.match(new RegExp(`'free', '${pattern.replace('/', '\\/')}',\\s*(\\d+)`));
    if (!m) throw new Error(`no free-tier rank seeded for ${pattern}`);
    return Number(m[1]);
  };

  it('falls back to a model that answers inside the edge timeout', () => {
    expect(shared).toMatch(/FREE_FALLBACK_MODEL = [\s\S]*?'inclusionai\/ling-3\.0-flash:free'/);
  });

  it('ranks the fast zero-cost model above the largest and the slowest', () => {
    // A 550B model that needs ~47s is not a better free default than a ~4s one
    // when the request is killed at ~30s.
    expect(rank('inclusionai/ling')).toBeGreaterThan(rank('nvidia/nemotron-3-ultra'));
    expect(rank('inclusionai/ling')).toBeGreaterThan(rank('openai/gpt-oss'));
  });
});

describe('every JSON-shaped model call goes through the retry', () => {
  it('leaves no direct parseJsonLoose(aiChat(...)) call sites behind', () => {
    // parseJsonLoose is the raw parser; call sites use aiJson so that a model
    // swap cannot reintroduce this failure one function at a time.
    const functions = import.meta.glob('../insforge/functions/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
    for (const [path, src] of Object.entries(functions)) {
      if (path.endsWith('_shared.ts')) continue;
      expect(src, `${path} should call aiJson, not parse aiChat output itself`).not.toContain('parseJsonLoose');
    }
  });
});
