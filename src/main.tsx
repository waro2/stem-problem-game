import React from 'react';
import { createRoot } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { App } from './App';
import { registerServiceWorker } from './pwa/registerServiceWorker';
import './styles/animations.css';

// Initialise native chrome before React renders.
if (Capacitor.isNativePlatform()) {
  void StatusBar.setStyle({ style: Style.Dark });
  if (Capacitor.getPlatform() === 'android') {
    void StatusBar.setBackgroundColor({ color: '#2E75B6' });
  }
} else {
  // Service worker only makes sense in browser context.
  registerServiceWorker();
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
