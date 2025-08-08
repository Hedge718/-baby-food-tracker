// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import App from './App';
import './index.css';

import { DataProvider } from './context/DataContext';
import { AllergyProvider } from './context/AllergyContext';
import ClientErrorBoundary from './components/ClientErrorBoundary';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { registerSW } from 'virtual:pwa-register';

// create a single QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,   // 5 min
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});

registerSW({ immediate: true });

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router>
      <ClientErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AllergyProvider>
            <DataProvider>
              <App />
            </DataProvider>
          </AllergyProvider>
        </QueryClientProvider>
      </ClientErrorBoundary>
    </Router>
  </React.StrictMode>
);
