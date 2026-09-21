import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import {
  DEFAULT_ASSUMPTIONS,
  DEFAULT_TIERS,
  seedMembers,
  seedMemos,
  seedNotifications,
  seedScenarios,
  seedStudies,
  type AppNotification,
  type Member,
} from '../data/seed';
import { uid } from '../logic/format';
import type {
  Assumptions,
  BillingPeriod,
  Currency,
  FeatureId,
  Memo,
  Scenario,
  Study,
  Tier,
  VWResponse,
} from '../logic/types';

export interface Toast {
  id: string;
  message: string;
  kind: 'success' | 'info' | 'error';
  action?: { label: string; href: string };
}

export interface Settings {
  profile: { name: string; title: string; email: string; timezone: string };
  defaults: { currency: Currency; billing: BillingPeriod; targetResponses: number; trimOutliers: boolean };
  notifications: {
    milestones: boolean;
    completed: boolean;
    memoViews: boolean;
    digest: boolean;
    email: boolean;
    inApp: boolean;
  };
}

export interface LabState {
  tiers: Tier[];
  assumptions: Assumptions;
  selectedTierId: string;
  loadedScenarioId: string | null;
}

interface State {
  studies: Study[];
  scenarios: Scenario[];
  memos: Memo[];
  notifications: AppNotification[];
  members: Member[];
  settings: Settings;
  lab: LabState;
  compareIds: string[];

  // session-only UI state
  toasts: Toast[];
  paletteOpen: boolean;
  introOpen: boolean;
  shortcutsOpen: boolean;
  freshMemoId: string | null;

  // studies
  addStudy: (s: Study) => void;
  updateStudy: (id: string, patch: Partial<Study>) => void;
  deleteStudy: (id: string) => void;
  duplicateStudy: (id: string) => string | null;
  addResponses: (id: string, responses: VWResponse[]) => void;
  completeStudy: (id: string) => void;

  // lab
  setTiers: (tiers: Tier[]) => void;
  updateTier: (id: string, patch: Partial<Tier>) => void;
  toggleFeature: (tierId: string, f: FeatureId) => void;
  setAssumptions: (patch: Partial<Assumptions>) => void;
  selectTier: (id: string) => void;
  loadScenario: (id: string) => void;
  resetLab: () => void;

  // scenarios
  saveScenario: (name: string, note: string) => string;
  renameScenario: (id: string, name: string, note?: string) => void;
  deleteScenario: (id: string) => void;
  duplicateScenario: (id: string) => string | null;
  setBaseline: (id: string) => void;
  setCompareIds: (ids: string[]) => void;

  // memos
  addMemo: (m: Memo, fresh?: boolean) => void;
  updateMemo: (id: string, patch: Partial<Memo>) => void;
  deleteMemo: (id: string) => void;
  clearFresh: () => void;

  // notifications & toasts
  notify: (n: Omit<AppNotification, 'id' | 'at' | 'read'>) => void;
  markAllRead: () => void;
  markRead: (id: string) => void;
  toast: (message: string, kind?: Toast['kind'], action?: Toast['action']) => void;
  dismissToast: (id: string) => void;

  // workspace
  inviteMember: (m: Pick<Member, 'name' | 'email' | 'role'>) => void;
  updateMember: (id: string, patch: Partial<Member>) => void;
  removeMember: (id: string) => void;
  updateSettings: <K extends keyof Settings>(key: K, patch: Partial<Settings[K]>) => void;
  resetSampleData: () => void;

  setPaletteOpen: (v: boolean) => void;
  setIntroOpen: (v: boolean) => void;
  setShortcutsOpen: (v: boolean) => void;
}

const safeStorage: StateStorage = {
  getItem: (name) => {
    try {
      return window.localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      window.localStorage.setItem(name, value);
    } catch {
      /* storage full or blocked: keep working in memory */
    }
  },
  removeItem: (name) => {
    try {
      window.localStorage.removeItem(name);
    } catch {
      /* ignore */
    }
  },
};

const cloneTiers = (t: Tier[]) => t.map((x) => ({ ...x, features: [...x.features] }));

function initialData() {
  const now = Date.now();
  const studies = seedStudies(now);
  const scenarios = seedScenarios(now);
  return {
    studies,
    scenarios,
    memos: seedMemos(studies, scenarios, now),
    notifications: seedNotifications(now),
    members: seedMembers(now),
    lab: {
      tiers: cloneTiers(DEFAULT_TIERS),
      assumptions: { ...DEFAULT_ASSUMPTIONS, mix: { ...DEFAULT_ASSUMPTIONS.mix } },
      selectedTierId: 'pro',
      loadedScenarioId: 'scn-baseline',
    } as LabState,
    compareIds: ['scn-pro99', 'scn-starter39'],
  };
}

const defaultSettings: Settings = {
  profile: { name: 'Aviv Braun', title: 'Product Marketing', email: 'aviv@tidepool.io', timezone: 'Asia/Jerusalem' },
  defaults: { currency: 'USD', billing: 'monthly', targetResponses: 200, trimOutliers: true },
  notifications: { milestones: true, completed: true, memoViews: true, digest: false, email: true, inApp: true },
};

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      ...initialData(),
      settings: defaultSettings,
      toasts: [],
      paletteOpen: false,
      introOpen: false,
      shortcutsOpen: false,
      freshMemoId: null,

      addStudy: (s) => set((st) => ({ studies: [s, ...st.studies] })),
      updateStudy: (id, patch) =>
        set((st) => ({
          studies: st.studies.map((s) => (s.id === id ? { ...s, ...patch, updatedAt: new Date().toISOString() } : s)),
        })),
      deleteStudy: (id) => set((st) => ({ studies: st.studies.filter((s) => s.id !== id) })),
      duplicateStudy: (id) => {
        const src = get().studies.find((s) => s.id === id);
        if (!src) return null;
        const nid = uid('study');
        const now = new Date().toISOString();
        const copy: Study = {
          ...src,
          id: nid,
          slug: `${src.slug}-copy-${nid.slice(-4)}`,
          name: `${src.name} (copy)`,
          status: 'draft',
          responses: [],
          createdAt: now,
          updatedAt: now,
          launchedAt: undefined,
          completedAt: undefined,
          owner: 'Aviv Braun',
        };
        set((st) => ({ studies: [copy, ...st.studies] }));
        return nid;
      },
      addResponses: (id, responses) =>
        set((st) => ({
          studies: st.studies.map((s) =>
            s.id === id
              ? { ...s, responses: [...s.responses, ...responses], updatedAt: new Date().toISOString() }
              : s,
          ),
        })),
      completeStudy: (id) =>
        set((st) => ({
          studies: st.studies.map((s) =>
            s.id === id
              ? { ...s, status: 'completed', completedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
              : s,
          ),
        })),

      setTiers: (tiers) => set((st) => ({ lab: { ...st.lab, tiers } })),
      updateTier: (id, patch) =>
        set((st) => ({ lab: { ...st.lab, tiers: st.lab.tiers.map((t) => (t.id === id ? { ...t, ...patch } : t)) } })),
      toggleFeature: (tierId, f) =>
        set((st) => ({
          lab: {
            ...st.lab,
            tiers: st.lab.tiers.map((t) =>
              t.id === tierId
                ? { ...t, features: t.features.includes(f) ? t.features.filter((x) => x !== f) : [...t.features, f] }
                : t,
            ),
          },
        })),
      setAssumptions: (patch) =>
        set((st) => ({ lab: { ...st.lab, assumptions: { ...st.lab.assumptions, ...patch } } })),
      selectTier: (id) => set((st) => ({ lab: { ...st.lab, selectedTierId: id } })),
      loadScenario: (id) => {
        const s = get().scenarios.find((x) => x.id === id);
        if (!s) return;
        set((st) => ({
          lab: {
            ...st.lab,
            tiers: cloneTiers(s.tiers),
            assumptions: { ...s.assumptions, mix: { ...s.assumptions.mix } },
            loadedScenarioId: id,
          },
        }));
      },
      resetLab: () => {
        const base = get().scenarios.find((s) => s.isBaseline);
        set((st) => ({
          lab: {
            ...st.lab,
            tiers: cloneTiers(base?.tiers ?? DEFAULT_TIERS),
            assumptions: base ? { ...base.assumptions, mix: { ...base.assumptions.mix } } : { ...DEFAULT_ASSUMPTIONS },
            loadedScenarioId: base?.id ?? null,
          },
        }));
      },

      saveScenario: (name, note) => {
        const id = uid('scn');
        const now = new Date().toISOString();
        const { lab } = get();
        const s: Scenario = {
          id,
          name,
          note,
          tiers: cloneTiers(lab.tiers),
          assumptions: { ...lab.assumptions, mix: { ...lab.assumptions.mix } },
          createdAt: now,
          updatedAt: now,
        };
        set((st) => ({
          scenarios: [...st.scenarios, s],
          lab: { ...st.lab, loadedScenarioId: id },
          compareIds: [...st.compareIds.filter((x) => x !== id), id].slice(-3),
        }));
        return id;
      },
      renameScenario: (id, name, note) =>
        set((st) => ({
          scenarios: st.scenarios.map((s) =>
            s.id === id ? { ...s, name, note: note ?? s.note, updatedAt: new Date().toISOString() } : s,
          ),
        })),
      deleteScenario: (id) =>
        set((st) => ({
          scenarios: st.scenarios.filter((s) => s.id !== id),
          compareIds: st.compareIds.filter((x) => x !== id),
          lab: st.lab.loadedScenarioId === id ? { ...st.lab, loadedScenarioId: null } : st.lab,
        })),
      duplicateScenario: (id) => {
        const src = get().scenarios.find((s) => s.id === id);
        if (!src) return null;
        const nid = uid('scn');
        const now = new Date().toISOString();
        set((st) => ({
          scenarios: [
            ...st.scenarios,
            {
              ...src,
              id: nid,
              name: `${src.name} (copy)`,
              tiers: cloneTiers(src.tiers),
              assumptions: { ...src.assumptions, mix: { ...src.assumptions.mix } },
              isBaseline: false,
              createdAt: now,
              updatedAt: now,
            },
          ],
        }));
        return nid;
      },
      setBaseline: (id) =>
        set((st) => ({
          scenarios: st.scenarios.map((s) => ({ ...s, isBaseline: s.id === id })),
          compareIds: st.compareIds.filter((x) => x !== id),
        })),
      setCompareIds: (ids) => set({ compareIds: ids.slice(0, 3) }),

      addMemo: (m, fresh = false) => set((st) => ({ memos: [m, ...st.memos], freshMemoId: fresh ? m.id : st.freshMemoId })),
      updateMemo: (id, patch) =>
        set((st) => ({
          memos: st.memos.map((m) => (m.id === id ? { ...m, ...patch, updatedAt: new Date().toISOString() } : m)),
        })),
      deleteMemo: (id) => set((st) => ({ memos: st.memos.filter((m) => m.id !== id) })),
      clearFresh: () => set({ freshMemoId: null }),

      notify: (n) =>
        set((st) => ({
          notifications: [{ ...n, id: uid('n'), at: new Date().toISOString(), read: false }, ...st.notifications].slice(0, 30),
        })),
      markAllRead: () => set((st) => ({ notifications: st.notifications.map((n) => ({ ...n, read: true })) })),
      markRead: (id) =>
        set((st) => ({ notifications: st.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) })),
      toast: (message, kind = 'success', action) => {
        const id = uid('t');
        set((st) => ({ toasts: [...st.toasts.slice(-3), { id, message, kind, action }] }));
        setTimeout(() => get().dismissToast(id), action ? 6500 : 4000);
      },
      dismissToast: (id) => set((st) => ({ toasts: st.toasts.filter((t) => t.id !== id) })),

      inviteMember: (m) =>
        set((st) => ({
          members: [
            ...st.members,
            { ...m, id: uid('m'), title: '—', status: 'Invited', lastActive: new Date().toISOString() },
          ],
        })),
      updateMember: (id, patch) =>
        set((st) => ({ members: st.members.map((m) => (m.id === id ? { ...m, ...patch } : m)) })),
      removeMember: (id) => set((st) => ({ members: st.members.filter((m) => m.id !== id) })),
      updateSettings: (key, patch) =>
        set((st) => ({ settings: { ...st.settings, [key]: { ...st.settings[key], ...patch } } })),
      resetSampleData: () => set({ ...initialData(), settings: defaultSettings }),

      setPaletteOpen: (v) => set({ paletteOpen: v }),
      setIntroOpen: (v) => set({ introOpen: v }),
      setShortcutsOpen: (v) => set({ shortcutsOpen: v }),
    }),
    {
      name: 'goldilocks-workspace-v1',
      version: 1,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({
        studies: s.studies,
        scenarios: s.scenarios,
        memos: s.memos,
        notifications: s.notifications,
        members: s.members,
        settings: s.settings,
        lab: s.lab,
        compareIds: s.compareIds,
      }),
    },
  ),
);

export const toast = (message: string, kind?: Toast['kind'], action?: Toast['action']) =>
  useStore.getState().toast(message, kind, action);

export function useBaseline(): Scenario {
  const scenarios = useStore((s) => s.scenarios);
  return scenarios.find((s) => s.isBaseline) ?? scenarios[0];
}
