import { generatePanel } from '../logic/panel';
import { generateMemo } from '../logic/memo';
import type { Assumptions, Memo, Scenario, Study, SurveyQuestions, Tier } from '../logic/types';

const HOUR = 3600_000;
const DAY = 24 * HOUR;

export const CURRENT_USER = {
  name: 'Aviv Braun',
  firstName: 'Aviv',
  title: 'Product Marketing',
  email: 'aviv@tidepool.io',
  initials: 'AB',
};

export const WORKSPACE = { name: 'Tidepool', plan: 'Team plan', domain: 'tidepool.io' };

export function defaultQuestions(): SurveyQuestions {
  return {
    tooCheap: 'At what monthly price would {product} be so cheap that you would question its quality?',
    cheap: 'At what monthly price would {product} be a bargain, a great buy for the money?',
    expensive: 'At what monthly price would {product} start to feel expensive, though you would still consider it?',
    tooExpensive: 'At what monthly price would {product} be so expensive that you would not consider buying it?',
  };
}

export const DEFAULT_TIERS: Tier[] = [
  { id: 'starter', name: 'Starter', price: 29, seatLimit: 10, features: ['integrations', 'guests'] },
  {
    id: 'pro',
    name: 'Pro',
    price: 79,
    seatLimit: 50,
    features: ['integrations', 'guests', 'timeTracking', 'analytics', 'automations', 'api'],
  },
  {
    id: 'business',
    name: 'Business',
    price: 199,
    seatLimit: null,
    features: [
      'integrations',
      'guests',
      'timeTracking',
      'analytics',
      'automations',
      'api',
      'customRoles',
      'sso',
      'auditLogs',
      'prioritySupport',
    ],
  },
];

export const DEFAULT_ASSUMPTIONS: Assumptions = {
  leads: 1800,
  trialRate: 0.32,
  annualDiscount: 0.15,
  mix: { smb: 0.5, mid: 0.35, ent: 0.15 },
};

export function seedStudies(now = Date.now()): Study[] {
  const pro: Study = {
    id: 'pro-q3',
    slug: 'tidepool-pro-q3',
    name: 'Pro plan pricing, Q3',
    product: 'Tidepool Pro',
    description: 'Acceptable monthly price range for the Pro plan ahead of the Q4 packaging refresh.',
    currency: 'USD',
    billing: 'monthly',
    status: 'completed',
    owner: 'Aviv Braun',
    createdAt: new Date(now - 26 * DAY).toISOString(),
    launchedAt: new Date(now - 21 * DAY).toISOString(),
    completedAt: new Date(now - 9 * DAY).toISOString(),
    updatedAt: new Date(now - 2 * DAY).toISOString(),
    segmentMix: { smb: 0.45, mid: 0.35, ent: 0.2 },
    targetResponses: 200,
    questions: defaultQuestions(),
    anchors: { smb: 58, mid: 82, ent: 115 },
    responses: [],
  };
  pro.responses = generatePanel('pro', 212, pro.segmentMix, pro.anchors, now - 9 * DAY, 12 * 24);

  const ent: Study = {
    id: 'ent-addons',
    slug: 'tidepool-ent-addons',
    name: 'Enterprise add-ons',
    product: 'the Tidepool Security & Compliance add-on',
    description: 'Willingness to pay for SSO, audit logs and data residency sold as an add-on.',
    currency: 'USD',
    billing: 'monthly',
    status: 'fielding',
    owner: 'Aviv Braun',
    createdAt: new Date(now - 6 * DAY).toISOString(),
    launchedAt: new Date(now - 3 * DAY).toISOString(),
    updatedAt: new Date(now - 2 * HOUR).toISOString(),
    segmentMix: { smb: 0.1, mid: 0.4, ent: 0.5 },
    targetResponses: 250,
    questions: defaultQuestions(),
    anchors: { smb: 30, mid: 48, ent: 75 },
    responses: [],
  };
  ent.responses = generatePanel('ent', 108, ent.segmentMix, ent.anchors, now - 20 * 60_000, 3 * 24);

  const starter: Study = {
    id: 'starter-tier',
    slug: 'tidepool-starter',
    name: 'Starter tier',
    product: 'Tidepool Starter',
    description: 'Entry price for small teams moving off spreadsheets.',
    currency: 'USD',
    billing: 'monthly',
    status: 'draft',
    owner: 'Priya Raman',
    createdAt: new Date(now - 1 * DAY).toISOString(),
    updatedAt: new Date(now - 5 * HOUR).toISOString(),
    segmentMix: { smb: 0.7, mid: 0.25, ent: 0.05 },
    targetResponses: 150,
    questions: defaultQuestions(),
    anchors: { smb: 14, mid: 20, ent: 30 },
    responses: [],
  };
  return [pro, ent, starter];
}

export function seedScenarios(now = Date.now()): Scenario[] {
  const clone = (t: Tier[]) => t.map((x) => ({ ...x, features: [...x.features] }));
  const baseline: Scenario = {
    id: 'scn-baseline',
    name: 'Current pricing',
    note: 'Live pricing page as of September 2026.',
    tiers: clone(DEFAULT_TIERS),
    assumptions: { ...DEFAULT_ASSUMPTIONS, mix: { ...DEFAULT_ASSUMPTIONS.mix } },
    createdAt: new Date(now - 20 * DAY).toISOString(),
    updatedAt: new Date(now - 20 * DAY).toISOString(),
    isBaseline: true,
  };
  const proUp = clone(DEFAULT_TIERS);
  proUp[1].price = 99;
  proUp[1].features.push('sso');
  proUp[2].price = 249;
  const s2: Scenario = {
    id: 'scn-pro99',
    name: 'Pro at $99 with SSO',
    note: 'Move SSO down to Pro to unblock mid-market, and reprice Pro and Business.',
    tiers: proUp,
    assumptions: { ...DEFAULT_ASSUMPTIONS, mix: { ...DEFAULT_ASSUMPTIONS.mix } },
    createdAt: new Date(now - 4 * DAY).toISOString(),
    updatedAt: new Date(now - 2 * DAY).toISOString(),
  };
  const lean = clone(DEFAULT_TIERS);
  lean[0].price = 39;
  lean[0].seatLimit = 5;
  const s3: Scenario = {
    id: 'scn-starter39',
    name: 'Starter $39, 5 seats',
    note: 'Tighter Starter fence to push growing teams into Pro.',
    tiers: lean,
    assumptions: { ...DEFAULT_ASSUMPTIONS, mix: { ...DEFAULT_ASSUMPTIONS.mix } },
    createdAt: new Date(now - 3 * DAY).toISOString(),
    updatedAt: new Date(now - 3 * DAY).toISOString(),
  };
  return [baseline, s2, s3];
}

export function seedMemos(studies: Study[], scenarios: Scenario[], now = Date.now()): Memo[] {
  const scenario = scenarios[1];
  const study = studies[0];
  const date = new Date(now - 2 * DAY);
  return [
    {
      id: 'memo-pro99',
      title: `${scenario.name}: pricing recommendation`,
      scenarioId: scenario.id,
      studyId: study.id,
      content: generateMemo({ scenario, baseline: scenarios[0], study, date }),
      createdAt: date.toISOString(),
      updatedAt: date.toISOString(),
      author: 'Aviv Braun',
      status: 'shared',
    },
  ];
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  at: string;
  read: boolean;
  href: string;
  kind: 'study' | 'memo' | 'digest' | 'member';
}

export function seedNotifications(now = Date.now()): AppNotification[] {
  return [
    {
      id: 'n1',
      title: 'Enterprise add-ons reached 100 responses',
      body: 'Preliminary analysis is available. 142 responses to go.',
      at: new Date(now - 2 * HOUR).toISOString(),
      read: false,
      href: '/studies/ent-addons/fielding',
      kind: 'study',
    },
    {
      id: 'n2',
      title: 'Maya Chen opened your memo',
      body: '"Pro at $99 with SSO: pricing recommendation"',
      at: new Date(now - 26 * HOUR).toISOString(),
      read: false,
      href: '/memos/memo-pro99',
      kind: 'memo',
    },
    {
      id: 'n3',
      title: 'Priya Raman created a draft study',
      body: 'Starter tier: 150 target responses, SMB-weighted.',
      at: new Date(now - 5 * HOUR).toISOString(),
      read: true,
      href: '/studies/new?draft=starter-tier',
      kind: 'member',
    },
    {
      id: 'n4',
      title: 'Pro plan pricing, Q3: analysis ready',
      body: '212 responses collected. Acceptable range computed.',
      at: new Date(now - 9 * DAY).toISOString(),
      read: true,
      href: '/studies/pro-q3/analysis',
      kind: 'study',
    },
  ];
}

export interface Member {
  id: string;
  name: string;
  email: string;
  title: string;
  role: 'Admin' | 'Editor' | 'Viewer';
  status: 'Active' | 'Invited';
  lastActive: string;
}

export function seedMembers(now = Date.now()): Member[] {
  return [
    { id: 'm1', name: 'Aviv Braun', email: 'aviv@tidepool.io', title: 'Product Marketing', role: 'Admin', status: 'Active', lastActive: new Date(now).toISOString() },
    { id: 'm2', name: 'Maya Chen', email: 'maya@tidepool.io', title: 'Head of Product', role: 'Editor', status: 'Active', lastActive: new Date(now - 26 * HOUR).toISOString() },
    { id: 'm3', name: 'Priya Raman', email: 'priya@tidepool.io', title: 'Growth PM', role: 'Editor', status: 'Active', lastActive: new Date(now - 5 * HOUR).toISOString() },
    { id: 'm4', name: 'Daniel Okafor', email: 'daniel@tidepool.io', title: 'Co-founder & CEO', role: 'Viewer', status: 'Active', lastActive: new Date(now - 3 * DAY).toISOString() },
    { id: 'm5', name: 'Tom Weller', email: 'tom@tidepool.io', title: 'Revenue Operations', role: 'Editor', status: 'Active', lastActive: new Date(now - 6 * DAY).toISOString() },
    { id: 'm6', name: 'Sofia Alvarez', email: 'sofia@tidepool.io', title: 'Sales Lead, EMEA', role: 'Viewer', status: 'Invited', lastActive: new Date(now - 1 * DAY).toISOString() },
  ];
}

export const INVOICES = [
  { id: 'INV-2026-0901', date: '2026-09-01', amount: 392, status: 'Paid' },
  { id: 'INV-2026-0801', date: '2026-08-01', amount: 392, status: 'Paid' },
  { id: 'INV-2026-0701', date: '2026-07-01', amount: 343, status: 'Paid' },
  { id: 'INV-2026-0601', date: '2026-06-01', amount: 343, status: 'Paid' },
];
