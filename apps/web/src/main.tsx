import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@k69/ui/tokens.css';
import './app.css';
import { App } from './App.js';

const rod = document.getElementById('rod');
if (!rod) throw new Error('Fandt ikke #rod');

createRoot(rod).render(
  <StrictMode>
    <App />
  </StrictMode>
);
