import { beforeAll, describe, expect, it } from 'vitest';
import { loadSharedHelpers } from './helpers/load';

/**
 * The free plan may only ever reach models that cost nothing, and the paid
 * default must move to a better model on its own when one appears. Both
 * promises live in pure helpers inside the shared edge-function layer, so they
 * are exercised here directly rather than re-implemented.
 */

let h: Record<string, any>;
beforeAll(() => { h = loadSharedHelpers(); });

const model = (id: string, inputPrice = 0, outputPrice = 0) => ({ id, inputPrice, outputPrice });

describe('free tier cost ceiling', () => {
  it('treats a genuinely free model as zero-cost', () => {
    expect(h.isZeroCost(model('openai/gpt-oss-20b:free'))).toBe(true);
  });

  it('does NOT treat deepseek-v4-flash as free — it costs $0.14/M', () => {
    expect(h.isZeroCost(model('deepseek/deepseek-v4-flash', 0.14, 0.28))).toBe(false);
  });

  it('defaults the ceiling to zero when the plan says nothing', () => {
    expect(h.freeModelCeiling({})).toBe(0);
    expect(h.freeModelCeiling({ max_model_input_price: 'nonsense' })).toBe(0);
  });

  it('with a zero ceiling, only zero-cost models are eligible', () => {
    expect(h.withinFreeCeiling(model('a:free'), 0)).toBe(true);
    expect(h.withinFreeCeiling(model('deepseek/deepseek-v4-flash', 0.14, 0.28), 0)).toBe(false);
    expect(h.withinFreeCeiling(model('anthropic/claude-opus-5', 5, 25), 0)).toBe(false);
  });

  it('a raised ceiling admits cheap models but still excludes premium ones', () => {
    const ceiling = h.freeModelCeiling({ max_model_input_price: 0.2 });
    expect(ceiling).toBe(0.2);
    expect(h.withinFreeCeiling(model('deepseek/deepseek-v4-flash', 0.14, 0.28), ceiling)).toBe(true);
    expect(h.withinFreeCeiling(model('anthropic/claude-opus-5', 5, 25), ceiling)).toBe(false);
  });

  it('never lets a negative or malformed ceiling open the gate', () => {
    expect(h.withinFreeCeiling(model('anthropic/claude-opus-5', 5, 25), h.freeModelCeiling({ max_model_input_price: -10 }))).toBe(false);
  });
});

describe('best-model-available resolution', () => {
  it('prefers a newer version of the same family', () => {
    expect(h.compareVersions('anthropic/claude-opus-5', 'anthropic/claude-opus-4.8')).toBeLessThan(0);
  });

  it('a future opus-6 automatically beats opus-5 with no code change', () => {
    const candidates = ['anthropic/claude-opus-4.8', 'anthropic/claude-opus-5', 'anthropic/claude-opus-6'];
    candidates.sort(h.compareVersions);
    expect(candidates[0]).toBe('anthropic/claude-opus-6');
  });

  it('handles decimal versions correctly (4.10 is newer than 4.9)', () => {
    expect(h.compareVersions('x-4.10', 'x-4.9')).toBeLessThan(0);
  });

  it('splits each digit run into its own component, so 4.10 outranks 4.9', () => {
    expect(h.versionKey('anthropic/claude-opus-4.8')).toEqual([4, 8]);
    expect(h.versionKey('google/gemini-3.1-flash-lite')).toEqual([3, 1]);
    expect(h.versionKey('anthropic/claude-opus-4.10')).toEqual([4, 10]);
  });

  it('still ranks a whole major version above a minor one', () => {
    expect(h.compareVersions('anthropic/claude-opus-5', 'anthropic/claude-opus-4.8')).toBeLessThan(0);
    expect(h.compareVersions('google/gemini-3.5-flash', 'google/gemini-3.1-flash-lite')).toBeLessThan(0);
  });
});

describe('chat-model filtering', () => {
  it.each([
    'nvidia/llama-nemotron-embed-vl-1b-v2:free',
    'nvidia/llama-nemotron-rerank-vl-1b-v2:free',
    'nvidia/nemotron-3.5-content-safety:free',
    'google/gemini-3.1-flash-tts-preview',
    'fish-audio/s2.1-pro-free:free',
  ])('rejects the non-chat model %s', (id) => {
    expect(h.isChatModel(model(id))).toBe(false);
  });

  it.each([
    'anthropic/claude-opus-5',
    'nvidia/nemotron-3-ultra-550b-a55b:free',
    'openai/gpt-oss-20b:free',
  ])('accepts the chat model %s', (id) => {
    expect(h.isChatModel(model(id))).toBe(true);
  });

  it('respects an explicit non-text output modality', () => {
    expect(h.isChatModel({ id: 'some/image-model', outputModality: ['image'] })).toBe(false);
    expect(h.isChatModel({ id: 'some/text-model', outputModality: ['text'] })).toBe(true);
  });
});

describe('model output parsing', () => {
  it('reads JSON wrapped in a fenced code block', () => {
    expect(h.parseJsonLoose('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it('recovers JSON embedded in prose', () => {
    expect(h.parseJsonLoose('Sure! {"score": 82} hope that helps')).toEqual({ score: 82 });
  });

  it('throws rather than silently returning garbage', () => {
    expect(() => h.parseJsonLoose('no json at all')).toThrow();
  });
});
