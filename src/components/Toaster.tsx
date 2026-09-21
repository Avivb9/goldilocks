import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';

export function Toaster() {
  const toasts = useStore((s) => s.toasts);
  const dismiss = useStore((s) => s.dismissToast);
  const navigate = useNavigate();
  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-[60] flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-2 no-print" aria-live="polite">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, transition: { duration: 0.15 } }}
            className="pointer-events-auto flex items-start gap-3 rounded-xl bg-[#1b1e22] px-4 py-3 text-[13px] text-white shadow-pop"
          >
            <span className="mt-px">
              {t.kind === 'success' && <CheckCircle2 size={16} className="text-brand-300" />}
              {t.kind === 'info' && <Info size={16} className="text-[#9fb8f5]" />}
              {t.kind === 'error' && <AlertCircle size={16} className="text-[#f59e8b]" />}
            </span>
            <div className="flex-1 leading-snug">
              {t.message}
              {t.action && (
                <button
                  className="mt-1.5 block font-semibold text-brand-300 hover:text-brand-200"
                  onClick={() => {
                    navigate(t.action!.href);
                    dismiss(t.id);
                  }}
                >
                  {t.action.label} →
                </button>
              )}
            </div>
            <button aria-label="Dismiss" onClick={() => dismiss(t.id)} className="text-white/50 hover:text-white">
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
