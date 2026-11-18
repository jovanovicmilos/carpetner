import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router';
import { Editor } from './Editor';
import { QuickStart } from './QuickStart';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<QuickStart />} />
        <Route path="/projekat" element={<Editor />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
