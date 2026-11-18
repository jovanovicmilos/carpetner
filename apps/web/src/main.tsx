import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router';
import { CutList } from './CutList';
import { Editor } from './Editor';
import { QuickStart } from './QuickStart';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<QuickStart />} />
        <Route path="/projekat" element={<Editor />} />
        <Route path="/krojna-lista" element={<CutList />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
