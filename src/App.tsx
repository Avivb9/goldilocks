import { useEffect } from 'react';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { IntroOverlay, introDismissed } from './components/IntroOverlay';
import { Layout } from './components/Layout';
import { AnalysisPage } from './pages/AnalysisPage';
import { FieldingPage } from './pages/FieldingPage';
import { HelpPage } from './pages/HelpPage';
import { MemoPage } from './pages/MemoPage';
import { MemosPage } from './pages/MemosPage';
import { NewStudyPage } from './pages/NewStudyPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { PackagingLabPage } from './pages/PackagingLabPage';
import { ScenariosPage } from './pages/ScenariosPage';
import { SettingsPage } from './pages/SettingsPage';
import { SignedOutPage } from './pages/SignedOutPage';
import { StudiesPage } from './pages/StudiesPage';
import { SurveyPage } from './pages/SurveyPage';
import { useStore } from './store/useStore';

function StudyRedirect() {
  const { id } = useParams();
  const study = useStore((s) => s.studies.find((x) => x.id === id));
  if (!study) return <NotFoundPage what="study" />;
  if (study.status === 'draft') return <Navigate to={`/studies/new?draft=${study.id}`} replace />;
  return <Navigate to={`/studies/${study.id}/${study.status === 'fielding' ? 'fielding' : 'analysis'}`} replace />;
}

export default function App() {
  const setIntroOpen = useStore((s) => s.setIntroOpen);
  useEffect(() => {
    if (!introDismissed() && !window.location.pathname.startsWith('/s/')) setIntroOpen(true);
  }, [setIntroOpen]);

  return (
    <>
      <Routes>
        <Route path="/s/:slug" element={<SurveyPage />} />
        <Route path="/signed-out" element={<SignedOutPage />} />
        <Route element={<Layout />}>
          <Route index element={<StudiesPage />} />
          <Route path="studies" element={<Navigate to="/" replace />} />
          <Route path="studies/new" element={<NewStudyPage />} />
          <Route path="studies/:id" element={<StudyRedirect />} />
          <Route path="studies/:id/analysis" element={<AnalysisPage />} />
          <Route path="studies/:id/fielding" element={<FieldingPage />} />
          <Route path="lab" element={<PackagingLabPage />} />
          <Route path="scenarios" element={<ScenariosPage />} />
          <Route path="memos" element={<MemosPage />} />
          <Route path="memos/:id" element={<MemoPage />} />
          <Route path="settings" element={<Navigate to="/settings/profile" replace />} />
          <Route path="settings/:tab" element={<SettingsPage />} />
          <Route path="help" element={<HelpPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
      <IntroOverlay />
    </>
  );
}
