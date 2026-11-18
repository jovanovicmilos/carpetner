import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router';
import { Drawings } from './Drawings';
import { Scene3D } from './Scene3D';
import { QuotePage } from './QuotePage';
import { CutList } from './CutList';
import { Editor } from './Editor';
import { ElementPage } from './ElementPage';
import { QuickStart } from './QuickStart';
import { WallView } from './WallView';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<QuickStart />} />
        <Route path="/projekat" element={<Editor />} />
        <Route path="/element/:id" element={<ElementPage />} />
        <Route path="/zid/:id?" element={<WallView />} />
        <Route path="/krojna-lista" element={<CutList />} />
        <Route path="/nacrti" element={<Drawings />} />
        <Route path="/3d" element={<Scene3D />} />
        <Route path="/ponuda" element={<QuotePage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
