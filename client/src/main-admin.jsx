import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import AppAdmin from './AppAdmin.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppAdmin />
  </StrictMode>,
);
