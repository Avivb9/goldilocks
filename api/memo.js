// Writes a pricing recommendation memo from the numbers Goldilocks has already
// computed. The model never sees raw survey rows and never does arithmetic of its
// own: it is given a list of figures and asked to cite them, and the client then
// checks every number in the answer against that same list.

const MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 1500;
const RATE_LIMIT = 10; // requests per IP per hour
const WINDOW_MS = 60 * 60 * 1000;

// Per-instance only; a serverless deployment may run several. Enough to keep a
// public demo from being hammered, not a substitute for a real rate limiter.
const hits = new Map();

function rateLimit(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= RATE_LIMIT) {
    hits.set(ip, recent);
    return { ok: false, retryAfter: Math.ceil((WINDOW_MS - (now - recent[0])) / 1000) };
  }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return { ok: true, remaining: RATE_LIMIT - recent.length };
}

const MEMO_TOOL = {
  name: 'submit_memo',
  description: 'Return the pricing recommendation memo as structured fields.',
  input_schema: {
    type: 'object',
    properties: {
      recommendation: {
        type: 'string',
        description:
          'Two or three sentences: what to ship, and the headline revenue and conversion effect. Cite figures from the list.',
      },
      rationale: {
        type: 'array',
        minItems: 3,
        maxItems: 5,
        items: { type: 'string' },
        description: 'Each point must cite at least one specific figure from the list, written the way the list displays it.',
      },
      risks: {
        type: 'array',
        minItems: 2,
        maxItems: 4,
        items: { type: 'string' },
        description: 'Each risk names what could go wrong and one mitigation. Cite a figure where one applies.',
      },
      priceTestPlan: {
        type: 'array',
        minItems: 3,
        maxItems: 5,
        items: { type: 'string' },
        description: 'Hypothesis, metrics, sample size and duration, and a decision rule. Use the test figures provided.',
      },
    },
    required: ['recommendation', 'rationale', 'risks', 'priceTestPlan'],
  },
};

const SYSTEM = `You are a pricing analyst writing an internal recommendation memo for a B2B SaaS product marketing team.

Rules:
- Every number you write MUST come from the "figures" list in the user message. Write each one exactly as its "display" field shows it (for example "$20,549", "+8.5%", "33.0%").
- Do not calculate, estimate, combine or round figures into new numbers. If a number is not in the list, describe it in words instead.
- The figures are modeled from a survey and a market model, not observed results. Say so where it matters, and treat the price test as the decision gate.
- Be specific and plain. No preamble, no marketing language, no bullet padding. Write for a product leader who will decide this week.
- Call the submit_memo tool exactly once.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST.' });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'The memo writer is not configured on this deployment.' });
  }

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
  const limit = rateLimit(ip);
  if (!limit.ok) {
    res.setHeader('Retry-After', String(limit.retryAfter));
    return res.status(429).json({ error: `That's ${RATE_LIMIT} memos this hour. Try again in ${Math.ceil(limit.retryAfter / 60)} minutes.` });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const inputs = body.inputs;
  if (!inputs || !Array.isArray(inputs.figures) || inputs.figures.length === 0) {
    return res.status(400).json({ error: 'Missing simulation inputs.' });
  }

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM,
        tools: [MEMO_TOOL],
        tool_choice: { type: 'tool', name: 'submit_memo' },
        messages: [
          {
            role: 'user',
            content: `Write the memo from these inputs.\n\n${JSON.stringify(
              {
                study: inputs.study,
                recommendedPackaging: inputs.scenario,
                currentPackaging: inputs.baseline,
                changes: inputs.changes,
                conventions: inputs.conventions,
                figures: inputs.figures.map((f) => ({ label: f.label, display: f.display })),
              },
              null,
              1,
            )}`,
          },
        ],
      }),
    });

    if (!upstream.ok) {
      const detail = await upstream.text();
      console.error('anthropic error', upstream.status, detail.slice(0, 500));
      const message =
        upstream.status === 429 ? 'The memo writer is busy right now. Try again in a moment.' : 'The memo writer could not be reached.';
      return res.status(502).json({ error: message });
    }

    const data = await upstream.json();
    const tool = (data.content ?? []).find((c) => c.type === 'tool_use' && c.name === 'submit_memo');
    if (!tool) return res.status(502).json({ error: 'The memo writer returned an unexpected response.' });

    return res.status(200).json({
      memo: tool.input,
      model: data.model,
      usage: data.usage,
      remaining: limit.remaining,
    });
  } catch (err) {
    console.error('memo handler failed', err);
    return res.status(502).json({ error: 'The memo writer could not be reached.' });
  }
}
