export type Segment = 'smb' | 'mid' | 'ent';
export const SEGMENTS: Segment[] = ['smb', 'mid', 'ent'];
export const SEGMENT_LABEL: Record<Segment, string> = {
  smb: 'SMB',
  mid: 'Mid-market',
  ent: 'Enterprise',
};

export type SegmentMix = Record<Segment, number>;

export interface VWResponse {
  id: string;
  segment: Segment;
  tooCheap: number;
  cheap: number;
  expensive: number;
  tooExpensive: number;
  submittedAt: string;
  source: 'link' | 'import' | 'panel';
}

export type StudyStatus = 'draft' | 'fielding' | 'completed';
export type Currency = 'USD' | 'EUR' | 'GBP';
export type BillingPeriod = 'monthly' | 'annual';

export interface SurveyQuestions {
  tooCheap: string;
  cheap: string;
  expensive: string;
  tooExpensive: string;
}

export interface Study {
  id: string;
  slug: string;
  name: string;
  product: string;
  description: string;
  currency: Currency;
  billing: BillingPeriod;
  status: StudyStatus;
  owner: string;
  createdAt: string;
  updatedAt: string;
  launchedAt?: string;
  completedAt?: string;
  segmentMix: SegmentMix;
  targetResponses: number;
  questions: SurveyQuestions;
  responses: VWResponse[];
  /** Reference price (median perceived value) per segment, drives the incoming panel. */
  anchors: Record<Segment, number>;
}

export type FeatureId =
  | 'integrations'
  | 'guests'
  | 'timeTracking'
  | 'analytics'
  | 'automations'
  | 'api'
  | 'customRoles'
  | 'sso'
  | 'auditLogs'
  | 'prioritySupport';

export interface Tier {
  id: string;
  name: string;
  price: number;
  /** null = unlimited seats */
  seatLimit: number | null;
  features: FeatureId[];
}

export interface Assumptions {
  leads: number;
  trialRate: number; // 0..1
  annualDiscount: number; // 0..0.4
  mix: SegmentMix; // shares, sum to 1
}

export interface Scenario {
  id: string;
  name: string;
  note: string;
  tiers: Tier[];
  assumptions: Assumptions;
  createdAt: string;
  updatedAt: string;
  isBaseline?: boolean;
}

export interface Memo {
  id: string;
  title: string;
  scenarioId: string;
  studyId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: string;
  status: 'draft' | 'shared';
}
