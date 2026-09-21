import { useEffect } from 'react';
import { nextRespondent } from '../logic/panel';
import { useStore } from '../store/useStore';

/**
 * Responses trickle into every study that's fielding while the app is open.
 * Arrival is bursty like a real panel: most ticks bring nothing or one response.
 */
export function useFieldingEngine() {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const st = useStore.getState();
      for (const s of st.studies) {
        if (s.status !== 'fielding') continue;
        const r = Math.random();
        const k = r < 0.42 ? 0 : r < 0.88 ? 1 : r < 0.97 ? 2 : 3;
        const have = s.responses.length;
        const n = Math.min(k, s.targetResponses - have);
        if (n <= 0 && have < s.targetResponses) continue;
        if (n > 0) {
          const fresh = Array.from({ length: n }, (_, i) => nextRespondent(s.id, have + i, s.segmentMix, s.anchors));
          st.addResponses(s.id, fresh);
        }
        const total = have + Math.max(0, n);
        const half = Math.ceil(s.targetResponses / 2);
        const prefs = st.settings.notifications;
        if (have < half && total >= half && prefs.milestones) {
          st.notify({
            title: `${s.name} is halfway there`,
            body: `${total} of ${s.targetResponses} responses collected.`,
            href: `/studies/${s.id}/fielding`,
            kind: 'study',
          });
        }
        if (total >= s.targetResponses) {
          st.completeStudy(s.id);
          if (prefs.completed) {
            st.notify({
              title: `${s.name} reached ${s.targetResponses} responses`,
              body: 'Fielding closed. Analysis is ready.',
              href: `/studies/${s.id}/analysis`,
              kind: 'study',
            });
          }
          st.toast(`${s.name} is complete: ${total} responses`, 'success', {
            label: 'View analysis',
            href: `/studies/${s.id}/analysis`,
          });
        }
      }
      timer = setTimeout(tick, 700 + Math.random() * 900);
    };
    timer = setTimeout(tick, 1200);
    return () => clearTimeout(timer);
  }, []);
}
