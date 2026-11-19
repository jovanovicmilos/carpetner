import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router';
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
import '../../../design/tokens.css';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
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
  </StrictMode>,
);
