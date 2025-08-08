// src/main.jsx
import '@fontsource-variable/inter';       // variable font (primary)
import '@fontsource/inter/400.css';        // static fallbacks
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';

import { DataProvider } from './context/DataContext';
import AllergyProvider from './context/AllergyContext'; // if you don’t use this, remove the provider lines
import ClientErrorBoundary from './components/ClientErrorBoundary'; // same note as above

import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router>
      <DataProvider>
        <AllergyProvider>
          <ClientErrorBoundary>
            <App />
          </ClientErrorBoundary>
        </AllergyProvider>
      </DataProvider>
    </Router>
  </React.StrictMode>
);
