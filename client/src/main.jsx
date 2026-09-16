import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { consumeTokenFromHash } from './utils/sso.js';
import './index.css';

// Бесшовный переход из админ-панели: приняли токен из #token=... (см. utils/sso.js)
consumeTokenFromHash();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
