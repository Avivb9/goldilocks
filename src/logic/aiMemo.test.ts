import { describe, expect, it, vi } from 'vitest';
import { aiMemoToMarkdown, buildAiMemoInputs, checkGrounding, type AiMemo } from './aiMemo';
import { DEFAULT_TIERS, seedScenarios, seedStudies } from '../data/seed';

const studies = seedStudies(Date.parse('2026-09-21T09:00:00Z'));
const scenarios = seedScenarios(Date.parse('2026-09-21T09:00:00Z'));
const inputs = buildAiMemoInputs({ scenario: scenarios[1], baseline: scenarios[0], study: studies[0] });

describe('AI memo inputs', () => {
  it('collects the figures the model is allowed to cite', () => {
    expect(inputs.figures.length).toBeGreaterThan(25);
    expect(inputs.figures.every((f) => isFinite(f.value) && f.display.length > 0)).toBe(true);
    expect(inputs.figures.find((f) => f.key === 'vw.pmc')).toBeTruthy();
    expect(inputs.figures.find((f) => f.key === 'model.mrrChangePct')).toBeTruthy();
    expect(inputs.changes.join(' ')).toContain('Pro');
    expect(inputs.scenario.tiers).toHaveLength(DEFAULT_TIERS.length);
  });
});

describe('grounding check', () => {
  const figure = (key: string) => inputs.figures.find((f) => f.key === key)!;

  it('traces numbers that came from the inputs', () => {
    const memo: AiMemo = {
      recommendation: `Ship it: new MRR moves to ${figure('model.mrr').display} (${figure('model.mrrChangePct').display}).`,
      rationale: [`Respondents accept ${figure('vw.pmc').display} to ${figure('vw.pme').display}.`],
      risks: [`Conversion lands at ${figure('model.conversion').display}.`],
      priceTestPlan: [`Run ${figure('test.weeks').display} on a 50/50 split at alpha 0.05.`],
    };
    const g = checkGrounding(memo, inputs);
    expect(g.untraced).toEqual([]);
    expect(g.traced).toBe(g.total);
    expect(g.total).toBeGreaterThan(5);
  });

  it('flags a number that is not in the inputs', () => {
    const memo: AiMemo = {
      recommendation: `New MRR moves to ${figure('model.mrr').display}.`,
      rationale: ['Churn improves by 31.7% and 412 accounts asked for it.'],
      risks: [],
      priceTestPlan: [],
    };
    const g = checkGrounding(memo, inputs);
    expect(g.untraced.map((h) => h.text)).toEqual(['31.7%', '412']);
    expect(g.traced).toBe(g.total - 2);
  });

  it('accepts rounding within tolerance but not a different figure', () => {
    const mrr = figure('model.mrr').value;
    const rounded = `$${Math.round(mrr / 10) * 10}`;
    const wrong = `$${Math.round(mrr * 1.4)}`;
    const g = checkGrounding({ recommendation: `${rounded} vs ${wrong}`, rationale: [], risks: [], priceTestPlan: [] }, inputs);
    expect(g.hits.find((h) => h.text === rounded)?.traced).toBe(true);
    expect(g.hits.find((h) => h.text === wrong)?.traced).toBe(false);
  });

  it('traces a figure written the way the app displays it', () => {
    // model.downgrades is 4.92 internally but Goldilocks prints it as 5
    const downgrades = figure('model.downgrades');
    expect(downgrades.display).toBe('5');
    const g = checkGrounding({ recommendation: 'About 5 accounts a month step down.', rationale: [], risks: [], priceTestPlan: [] }, inputs);
    expect(g.untraced).toEqual([]);
  });

  it('renders the structured fields as memo markdown', () => {
    const md = aiMemoToMarkdown(
      { recommendation: 'Ship it.', rationale: ['One', 'Two'], risks: ['A risk'], priceTestPlan: ['A step'] },
      inputs,
      new Date('2026-11-10T00:00:00Z'),
    );
    expect(md).toContain('## Recommendation');
    expect(md).toContain('1. One');
    expect(md).toContain('- A risk');
    expect(md).toContain('## Price-test plan');
  });
});

describe('memo API handler', () => {
  const load = async () => (await import('../../api/memo.js')).default as (req: unknown, res: unknown) => Promise<unknown>;
  const makeRes = () => {
    const res = {
      statusCode: 0,
      body: null as unknown,
      headers: {} as Record<string, string>,
      setHeader(k: string, v: string) {
        res.headers[k] = v;
      },
      status(code: number) {
        res.statusCode = code;
        return res;
      },
      json(payload: unknown) {
        res.body = payload;
        return res;
      },
    };
    return res;
  };
  const makeReq = (ip = '1.2.3.4') => ({
    method: 'POST',
    headers: { 'x-forwarded-for': ip },
    socket: { remoteAddress: ip },
    body: { inputs },
  });

  it('calls the model with a forced tool and returns the structured memo', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    const memo = { recommendation: 'Ship it.', rationale: ['a'], risks: ['b'], priceTestPlan: ['c'] };
    const fetchMock = vi.fn(async (_url: string, init: { body: string }) => {
      void init;
      return {
        ok: true,
        json: async () => ({ model: 'claude-haiku-4-5-20251001', content: [{ type: 'tool_use', name: 'submit_memo', input: memo }], usage: {} }),
      };
    });
    vi.stubGlobal('fetch', fetchMock);

    const handler = await load();
    const res = makeRes();
    await handler(makeReq('9.9.9.1'), res);

    expect(res.statusCode).toBe(200);
    expect((res.body as { memo: unknown }).memo).toEqual(memo);
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sent.model).toBe('claude-haiku-4-5-20251001');
    expect(sent.max_tokens).toBeLessThanOrEqual(1500);
    expect(sent.tool_choice).toEqual({ type: 'tool', name: 'submit_memo' });
    expect(sent.tools[0].input_schema.required).toEqual(['recommendation', 'rationale', 'risks', 'priceTestPlan']);
    // raw survey responses never leave the browser
    expect(fetchMock.mock.calls[0][1].body).not.toContain('tooExpensive');
    vi.unstubAllGlobals();
  });

  it('rate limits an IP after 10 requests an hour', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ content: [{ type: 'tool_use', name: 'submit_memo', input: { recommendation: 'x', rationale: [], risks: [], priceTestPlan: [] } }] }),
      })),
    );
    const handler = await load();
    let last = makeRes();
    for (let i = 0; i < 11; i++) {
      last = makeRes();
      await handler(makeReq('8.8.8.8'), last);
    }
    expect(last.statusCode).toBe(429);
    expect(last.headers['Retry-After']).toBeTruthy();
    vi.unstubAllGlobals();
  });

  it('refuses when the key is missing or the payload is empty', async () => {
    const handler = await load();
    delete process.env.ANTHROPIC_API_KEY;
    const noKey = makeRes();
    await handler(makeReq('7.7.7.1'), noKey);
    expect(noKey.statusCode).toBe(503);

    process.env.ANTHROPIC_API_KEY = 'test-key';
    const bad = makeRes();
    await handler({ ...makeReq('7.7.7.2'), body: {} }, bad);
    expect(bad.statusCode).toBe(400);
  });
});
