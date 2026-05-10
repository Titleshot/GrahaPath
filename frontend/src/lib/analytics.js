const GA_MEASUREMENT_ID = String(import.meta.env.VITE_GA_MEASUREMENT_ID || '').trim();

let initialized = false;

function canUseDom() {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function injectGtagScript(measurementId) {
  const src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  const already = Array.from(document.getElementsByTagName('script')).some((tag) => tag.src === src);
  if (already) return;
  const script = document.createElement('script');
  script.async = true;
  script.src = src;
  document.head.appendChild(script);
}

export function initAnalytics() {
  if (!canUseDom()) return;
  if (!GA_MEASUREMENT_ID || initialized) return;

  injectGtagScript(GA_MEASUREMENT_ID);
  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    function gtag() {
      window.dataLayer.push(arguments);
    };

  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID, {
    send_page_view: false
  });

  initialized = true;
}

export function trackPageView(pathname = '/') {
  if (!canUseDom()) return;
  if (!GA_MEASUREMENT_ID || typeof window.gtag !== 'function') return;

  window.gtag('event', 'page_view', {
    page_path: pathname,
    page_location: window.location.href,
    page_title: document.title
  });
}

export function trackEvent(eventName, params = {}) {
  if (!canUseDom()) return;
  if (!GA_MEASUREMENT_ID || typeof window.gtag !== 'function') return;
  if (!eventName) return;
  window.gtag('event', String(eventName), params);
}

export { GA_MEASUREMENT_ID };
