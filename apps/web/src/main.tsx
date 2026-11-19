import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router';
import { Drawings } from './Drawings';
import { Scene3D } from './Scene3D';
import { QuotePage } from './QuotePage';
import { Compare } from './Compare';
import { PriceListPage } from './PriceListPage';
import { StandardsPage } from './StandardsPage';
import { AiSettingsPage } from './AiSettingsPage';
import { LoginPage } from './LoginPage';
import { SitePage } from './SitePage';
import { AiProposalPage } from './AiProposalPage';
import { CutList } from './CutList';
import { Editor } from './Editor';
import { Configurator } from './Configurator';
import { ElementPage } from './ElementPage';
import { LibraryPage } from './LibraryPage';
import { QuickStart } from './QuickStart';
import { WallView } from './WallView';
import { ProjectsPage } from './ProjectsPage';
import { saveResume } from './projects';
import { TooltipProvider } from '@/components/ui/tooltip';
import './index.css'; // Tailwind v4 + shadcn theme (docs/UI_KOMPONENTE.md); also loads the old tokens.css + styles.css in a layer

/** "Nastavi gde si stao": every project screen the user opens is remembered for the open project (projects.ts). */
function ResumeTracker() {
  const { pathname, search } = useLocation();
  useEffect(() => saveResume(pathname + search), [pathname, search]);
  return null;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TooltipProvider>
    <BrowserRouter>
      <ResumeTracker />
      <Routes>
        <Route path="/projekti" element={<ProjectsPage />} />
        <Route path="/" element={<QuickStart />} />
        <Route path="/projekat" element={<Editor />} />
        <Route path="/element/:id" element={<ElementPage />} />
        <Route path="/prilagodjeni" element={<Configurator />} />
        <Route path="/zid/:id?" element={<WallView />} />
        <Route path="/krojna-lista" element={<CutList />} />
        <Route path="/nacrti" element={<Drawings />} />
        <Route path="/3d" element={<Scene3D />} />
        <Route path="/ponuda" element={<QuotePage />} />
        <Route path="/poredjenje" element={<Compare />} />
        <Route path="/admin/cenovnik" element={<PriceListPage />} />
        <Route path="/admin/biblioteka" element={<LibraryPage />} />
        <Route path="/admin/standardi" element={<StandardsPage />} />
        <Route path="/admin/ai" element={<AiSettingsPage />} />
        <Route path="/prijava" element={<LoginPage />} />
        <Route path="/sajt" element={<SitePage />} />
        <Route path="/ai-predlog" element={<AiProposalPage />} />
      </Routes>
    </BrowserRouter>
    </TooltipProvider>
  </StrictMode>,
);
