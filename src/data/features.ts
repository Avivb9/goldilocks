import type { FeatureId, Segment } from '../logic/types';

export interface FeatureDef {
  id: FeatureId;
  name: string;
  short: string;
  description: string;
  /** Probability a prospect in each segment treats it as a must-have */
  mustHave: Record<Segment, number>;
  /** Median monthly value ($) when it's a nice-to-have */
  niceValue: Record<Segment, number>;
}

export const FEATURES: FeatureDef[] = [
  {
    id: 'integrations',
    name: 'Integrations',
    short: 'Integrations',
    description: 'Slack, Jira, GitHub and Google Drive sync',
    mustHave: { smb: 0.3, mid: 0.55, ent: 0.75 },
    niceValue: { smb: 9, mid: 16, ent: 28 },
  },
  {
    id: 'guests',
    name: 'Guest access',
    short: 'Guests',
    description: 'Invite clients and contractors to projects',
    mustHave: { smb: 0.1, mid: 0.22, ent: 0.28 },
    niceValue: { smb: 5, mid: 10, ent: 16 },
  },
  {
    id: 'timeTracking',
    name: 'Time tracking',
    short: 'Time',
    description: 'Log hours against tasks and milestones',
    mustHave: { smb: 0.12, mid: 0.18, ent: 0.18 },
    niceValue: { smb: 6, mid: 10, ent: 14 },
  },
  {
    id: 'analytics',
    name: 'Advanced analytics',
    short: 'Analytics',
    description: 'Portfolio dashboards, forecasting and risk signals',
    mustHave: { smb: 0.04, mid: 0.28, ent: 0.52 },
    niceValue: { smb: 6, mid: 22, ent: 55 },
  },
  {
    id: 'automations',
    name: 'Workflow automations',
    short: 'Automations',
    description: 'Rules, recurring tasks and approval flows',
    mustHave: { smb: 0.08, mid: 0.3, ent: 0.42 },
    niceValue: { smb: 8, mid: 20, ent: 40 },
  },
  {
    id: 'api',
    name: 'API access',
    short: 'API',
    description: 'REST API and webhooks',
    mustHave: { smb: 0.04, mid: 0.22, ent: 0.58 },
    niceValue: { smb: 3, mid: 14, ent: 45 },
  },
  {
    id: 'customRoles',
    name: 'Custom roles',
    short: 'Roles',
    description: 'Granular permissions beyond admin and member',
    mustHave: { smb: 0.02, mid: 0.16, ent: 0.55 },
    niceValue: { smb: 2, mid: 12, ent: 38 },
  },
  {
    id: 'sso',
    name: 'SSO / SAML',
    short: 'SSO',
    description: 'Okta, Azure AD and Google Workspace SAML',
    mustHave: { smb: 0.02, mid: 0.3, ent: 0.88 },
    niceValue: { smb: 1, mid: 15, ent: 55 },
  },
  {
    id: 'auditLogs',
    name: 'Audit logs',
    short: 'Audit',
    description: '12-month activity history with export',
    mustHave: { smb: 0.01, mid: 0.1, ent: 0.66 },
    niceValue: { smb: 1, mid: 8, ent: 45 },
  },
  {
    id: 'prioritySupport',
    name: 'Priority support',
    short: 'Support',
    description: '4-hour response SLA and a named CSM',
    mustHave: { smb: 0.02, mid: 0.08, ent: 0.42 },
    niceValue: { smb: 3, mid: 12, ent: 40 },
  },
];

export const FEATURE_INDEX: Record<FeatureId, number> = FEATURES.reduce(
  (acc, f, i) => ({ ...acc, [f.id]: i }),
  {} as Record<FeatureId, number>,
);

export const FEATURE_NAME: Record<FeatureId, string> = FEATURES.reduce(
  (acc, f) => ({ ...acc, [f.id]: f.name }),
  {} as Record<FeatureId, string>,
);
