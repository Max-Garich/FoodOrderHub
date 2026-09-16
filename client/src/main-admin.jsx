import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import AppAdmin from './AppAdmin.jsx';
import { consumeTokenFromHash } from './utils/sso.js';
import './index.css';

// Бесшовный переход с основного сайта: приняли токен из #token=... (см. utils/sso.js)
consumeTokenFromHash();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppAdmin />
  </StrictMode>,
);
