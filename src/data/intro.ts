export const intro = {
  eyebrow: 'PMM portfolio project',
  title: 'Goldilocks',
  hook: "Find the price that's just right.",
  author: 'Aviv Braun · B2B Product Marketing',
  authorUrl: 'https://avivbraun.com',

  problem: {
    heading: 'The problem',
    body: [
      "Pricing usually gets decided in a room with a spreadsheet and a lot of gut feel. Someone anchors on a competitor, someone else on last year's number, and the loudest opinion wins.",
      'As a PMM I rarely get to show the tradeoffs before launch: what a price change does to conversion, which features actually push people up a tier, and how much we leave on the table. By the time we see it in the data, the pricing page is live and the sales team has already learned the new objections.',
    ],
  },

  audience: {
    heading: 'Who feels it',
    items: [
      { who: 'Product marketers', why: 'who own packaging and the pricing page but not the model behind it.' },
      { who: 'Product leaders', why: 'deciding which features belong in which tier.' },
      { who: 'Founders', why: 'setting a first price or changing one without breaking growth.' },
    ],
  },

  steps: {
    heading: 'Try it in 3 steps',
    items: [
      {
        title: 'Read the price range',
        body: 'Open the completed "Pro plan pricing, Q3" study. Check the acceptable price range, then switch segments and watch it move.',
      },
      {
        title: 'Change the packaging',
        body: "Open the Packaging lab. Change a tier's price and features and watch customers, MRR and the insights react.",
      },
      {
        title: 'Decide and write it up',
        body: 'Save two scenarios, compare them against the baseline, and generate the recommendation memo.',
      },
    ],
  },

  metrics: {
    heading: "How I'd measure it",
    items: [
      { value: '+10–15%', label: 'Modeled MRR lift vs baseline', note: 'Target for the recommended scenario' },
      { value: '>60%', label: 'Price-test hit rate', note: "Share of live tests that confirm the model's direction" },
      { value: '−20%', label: 'Discount rate', note: 'Fewer off-list deals once the packaging fits the buyer' },
    ],
  },

  approach: {
    heading: 'My approach',
    items: [
      {
        title: 'Van Westendorp for the acceptable range',
        body: "It's four questions, cheap to field, and it gives a defensible range rather than a single number. It's the right first instrument before spending on conjoint.",
      },
      {
        title: 'A segment-level choice model for packaging',
        body: 'A range tells you nothing about tiers. Modeling prospects with seats, must-haves and budgets shows who moves up, who moves down, and who walks away.',
      },
      {
        title: 'A memo that carries a test plan',
        body: 'Models are directional. Every recommendation ships with an A/B test, a sample size and a rollback rule, so the decision is made on real data.',
      },
    ],
  },

  cta: 'Start exploring',
  skip: 'Skip',
  closing: 'Working prototype built with Claude Code.',
};
