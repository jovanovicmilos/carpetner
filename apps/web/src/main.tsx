import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QuickStart } from './QuickStart';
import './styles.css';

createRoot(document.getElementById('root')!).render(<StrictMode><QuickStart /></StrictMode>);
