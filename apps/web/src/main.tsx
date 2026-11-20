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
import { AiProposalPage } from './AiProposalPage';
import { CutList } from './CutList';
import { Editor } from './Editor';
import { Configurator } from './Configurator';
import { ElementPage } from './ElementPage';
import { LibraryPage } from './LibraryPage';
import { QuickStart } from './QuickStart';
import { WallView } from './WallView';
import { ProjectsPage } from './ProjectsPage';
import { SubscriptionPage } from './SubscriptionPage';
import { CustomerStart } from './CustomerStart';
import { Planner } from './Planner';
import { Pregled } from './Pregled';
import { GalleryPage, HomePage, KitchenPage, WorkshopsPage } from './Site';
import { saveResume } from './projects';
import { startSync } from './sync';

startSync();
import { TooltipProvider } from '@/components/ui/tooltip';
import './index.css'; // Tailwind v4 + shadcn theme (docs/UI_KOMPONENTE.md), the only CSS of the app

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
        <Route path="/brzi-start" element={<QuickStart />} />
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
        <Route path="/kupac" element={<CustomerStart />} />
        <Route path="/kupac/kuhinja" element={<Planner role="kupac" />} />
        <Route path="/planer" element={<Planner role="stolar" />} />
        <Route path="/kupac/pregled" element={<Pregled />} />
        <Route path="/" element={<HomePage />} />
        <Route path="/inspiracija" element={<GalleryPage />} />
        <Route path="/kuhinja/:id" element={<KitchenPage />} />
        <Route path="/za-stolare" element={<WorkshopsPage />} />
        <Route path="/pretplata" element={<SubscriptionPage />} />
        <Route path="/prijava" element={<LoginPage />} />
        <Route path="/ai-predlog" element={<AiProposalPage />} />
      </Routes>
    </BrowserRouter>
    </TooltipProvider>
  </StrictMode>,
);
