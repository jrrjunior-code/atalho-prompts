/**
 * Atalho - Main Entry Point
 * Initializes the app, registers islands, and sets up PWA
 */

// Import islands to register them
import '../islands/PaginatedCatalog';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

// PWA Service Worker Registration
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const baseUrl = import.meta.env.BASE_URL;
      const registration = await navigator.serviceWorker.register(`${baseUrl}sw.js`, {
        scope: baseUrl,
      });

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available - show update toast
              showUpdateAvailableToast();
            }
          });
        }
      });

      console.log('✅ Service Worker registered:', registration.scope);
    } catch (error) {
      console.warn('⚠️ Service Worker registration failed:', error);
    }
  });
}

// Show update available toast
function showUpdateAvailableToast(): void {
  const toastContainer = document.getElementById('toast-container');
  if (!toastContainer) return;

  const toast = document.createElement('div');
  toast.className = 'toast toast-info toast-enter';
  toast.innerHTML = `
    <span>Nova versão disponível!</span>
    <button class="btn btn-sm btn-primary" onclick="window.location.reload()">Atualizar</button>
  `;
  toastContainer.appendChild(toast);
}

// Analytics (Plausible/GA) - initialized from meta tag
function initAnalytics(): void {
  const plausibleDomain = document.querySelector('meta[name="plausible-domain"]')?.getAttribute('content');
  const gaId = document.querySelector('meta[name="ga-measurement-id"]')?.getAttribute('content');

  // Plausible
  if (plausibleDomain) {
    const script = document.createElement('script');
    script.defer = true;
    script.dataset.domain = plausibleDomain;
    script.src = 'https://plausible.io/js/script.js';
    document.head.appendChild(script);
  }

  // Google Analytics
  if (gaId) {
    const dataLayer = window.dataLayer || [];
    window.dataLayer = dataLayer;
    function gtag(...args: unknown[]) { dataLayer.push(args); }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', gaId);

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
    document.head.appendChild(script);
  }
}

// Initialize analytics after DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAnalytics);
} else {
  initAnalytics();
}

console.log('🚀 Atalho carregado com sucesso!');