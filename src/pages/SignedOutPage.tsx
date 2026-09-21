import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { Avatar, Button } from '../components/ui';
import { useStore } from '../store/useStore';

export function SignedOutPage() {
  const navigate = useNavigate();
  const profile = useStore((s) => s.settings.profile);
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm rounded-2xl border border-line bg-surface p-8 text-center shadow-pop">
        <Logo className="justify-center" />
        <h1 className="mt-6 font-display text-[24px]">You're signed out</h1>
        <p className="mt-1 text-[14px] text-muted">Pick up where you left off in the Tidepool workspace.</p>
        <button
          onClick={() => navigate('/')}
          className="mt-6 flex w-full items-center gap-3 rounded-xl border border-line p-3 text-left transition-colors hover:border-brand-400 hover:bg-brand-50/40"
        >
          <Avatar name={profile.name} size={36} />
          <span className="flex-1">
            <span className="block text-[14px] font-semibold">{profile.name}</span>
            <span className="block text-[12px] text-muted">{profile.email}</span>
          </span>
        </button>
        <Button variant="primary" size="lg" className="mt-4 w-full" onClick={() => navigate('/')}>
          Continue as {profile.name.split(' ')[0]}
        </Button>
        <p className="mt-4 text-[12px] text-faint">Protected by Tidepool SSO</p>
      </motion.div>
    </div>
  );
}
