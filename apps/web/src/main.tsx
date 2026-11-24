import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router';
import { Drawings } from './Drawings';
import { Scene3D } from './Scene3D';
import { Ponude } from './Ponude';
import { MojeKuhinje } from './MojeKuhinje';
import { RadionicaPage, RadionicePage } from './Radionice';
import { SharedKitchen } from './SharedKitchen';
import { ProfilRadionice } from './ProfilRadionice';
import { Saradnja } from './Saradnja';
import { SaradnjaLive } from './SaradnjaLive';
import { Upiti } from './Upiti';
import { QuotePage } from './QuotePage';
import { Compare } from './Compare';
import { PriceListPage } from './PriceListPage';
import { StandardsPage } from './StandardsPage';
import { KorisniciPage } from './KorisniciPage';
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
import { AdminShellDemo, AppShellDemo } from './ShellDemo';
import { Posalji } from './Posalji';
import { Pregled } from './Pregled';
import { GalleryPage, KitchenPage, WorkshopsPage } from './Site';
import { HomePage } from './SiteHome';
import { saveResume } from './projects';
import { startSync } from './sync';

startSync();
// Dev only: site pictures from the real app (design/BRIEF_SITE_ASSETS.md); left out of the build.
const SiteAssets = import.meta.env.DEV ? lazy(() => import('./SiteAssets')) : null;
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
        <Route path="/podesavanja/korisnici" element={<KorisniciPage />} />
        <Route path="/kupac" element={<CustomerStart />} />
        <Route path="/kupac/kuhinja" element={<Navigate to="/kupac/prostor" replace />} /> {/* old Raspored links */}
        <Route path="/planer" element={<Navigate to="/projekat" replace />} />
        <Route path="/dizajn/glavni-meni" element={<AppShellDemo />} />
        <Route path="/dizajn/radionica" element={<AdminShellDemo />} />
        <Route path="/kupac/prostor" element={<Editor customer />} />
        <Route path="/kupac/vodic" element={<CustomerStart edit />} />
        <Route path="/kupac/prilagodjeni" element={<Configurator customer />} />
        <Route path="/kupac/zid/:id?" element={<WallView customer />} />
        <Route path="/kupac/izgled" element={<Scene3D customer />} />
        <Route path="/kupac/pregled" element={<Pregled />} />
        <Route path="/kupac/posalji" element={<Posalji />} />
        <Route path="/kupac/ponude" element={<Ponude />} />
        <Route path="/moje-kuhinje" element={<MojeKuhinje />} />
        <Route path="/radionice" element={<RadionicePage />} />
        <Route path="/radionice/:id" element={<RadionicaPage />} />
        <Route path="/k/:token" element={<SharedKitchen />} />
        <Route path="/podesavanja/profil" element={<ProfilRadionice />} />
        <Route path="/saradnja" element={<Saradnja />} />
        <Route path="/saradnja/:id" element={<SaradnjaLive />} />
        <Route path="/upiti" element={<Upiti />} />
        <Route path="/" element={<HomePage />} />
        <Route path="/inspiracija" element={<GalleryPage />} />
        <Route path="/kuhinja/:id" element={<KitchenPage />} />
        <Route path="/za-stolare" element={<WorkshopsPage />} />
        <Route path="/pretplata" element={<SubscriptionPage />} />
        <Route path="/prijava" element={<LoginPage />} />
        <Route path="/ai-predlog" element={<AiProposalPage />} />
        {SiteAssets && <Route path="/dev/site-assets" element={<Suspense><SiteAssets /></Suspense>} />}
      </Routes>
    </BrowserRouter>
    </TooltipProvider>
  </StrictMode>,
);
