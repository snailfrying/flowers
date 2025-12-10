import React from 'react';
import ReactDOM from 'react-dom/client';
import '../styles/globals.css';
import '../shared/i18n/i18n';
import App from './App.js';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

