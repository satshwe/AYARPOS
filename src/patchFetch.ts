import { createVercelSmartFetch } from './utils/vercelApiFallback';

/**
 * Safety patch for environments where browser extensions or proxies attempt to
 * overwrite window.fetch (e.g. window.fetch = ...), which fails with:
 * "TypeError: Cannot set property fetch of #<Window> which has only a getter"
 */
(function setupFetchInterceptorSafe() {
  if (typeof window === 'undefined') return;

  try {
    const rawFetch = window.fetch ? window.fetch.bind(window) : undefined;
    const originalFetch = rawFetch ? createVercelSmartFetch(rawFetch) : undefined;
    let currentFetch = originalFetch;

    // Define both getter and setter on window
    Object.defineProperty(window, 'fetch', {
      get() {
        return currentFetch;
      },
      set(newFetch) {
        currentFetch = newFetch;
      },
      configurable: true,
      enumerable: true,
    });

    // Also define on Window.prototype if accessible
    try {
      const winProto = Object.getPrototypeOf(window);
      if (winProto) {
        Object.defineProperty(winProto, 'fetch', {
          get() {
            return currentFetch;
          },
          set(newFetch) {
            currentFetch = newFetch;
          },
          configurable: true,
          enumerable: true,
        });
      }
    } catch {
      // Prototype may be non-extensible in some environments
    }
  } catch (err) {
    // Graceful fallback
    console.debug('Fetch setter polyfill notice:', err);
  }

  // Intercept and suppress extension-originating unhandled errors
  window.addEventListener(
    'error',
    (event) => {
      if (
        (event.filename &&
          (event.filename.includes('chrome-extension://') ||
            event.filename.includes('moz-extension://'))) ||
        (event.message &&
          (event.message.includes('Cannot set property fetch') ||
            event.message.includes('WebSocket closed without opened') ||
            event.message.includes('failed to connect to websocket')))
      ) {
        event.preventDefault();
        event.stopPropagation();
        return true;
      }
    },
    true
  );

  window.addEventListener(
    'unhandledrejection',
    (event) => {
      const msg =
        event.reason && typeof event.reason.message === 'string'
          ? event.reason.message
          : String(event.reason || '');
      if (
        msg.includes('Cannot set property fetch') ||
        msg.includes('WebSocket closed without opened') ||
        msg.includes('failed to connect to websocket')
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
    true
  );
})();
