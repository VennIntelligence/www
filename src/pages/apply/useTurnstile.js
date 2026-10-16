import { useCallback, useEffect, useRef, useState } from 'react';

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let scriptPromise = null;

/** Load the Turnstile script once per page session (only /apply calls this). */
function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SCRIPT_SRC;
      script.async = true;
      script.onload = () => resolve(window.turnstile);
      script.onerror = () => {
        scriptPromise = null;
        script.remove();
        reject(new Error('turnstile_load_failed'));
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

/**
 * useTurnstile — render an explicit Cloudflare Turnstile widget into `containerRef`.
 * Returns `{ token, reset, failed }`; the widget is removed on unmount or when key/language change.
 */
export function useTurnstile(containerRef, siteKey, lang) {
  const [token, setToken] = useState('');
  const [failed, setFailed] = useState(false);
  const widgetRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!siteKey || !container) return undefined;
    let cancelled = false;

    loadTurnstile()
      .then((turnstile) => {
        if (cancelled) return;
        widgetRef.current = turnstile.render(container, {
          sitekey: siteKey,
          theme: 'dark',
          language: lang === 'zh' ? 'zh-cn' : 'en',
          callback: setToken,
          'expired-callback': () => setToken(''),
          'error-callback': () => setToken(''),
        });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      if (widgetRef.current !== null) window.turnstile?.remove(widgetRef.current);
      widgetRef.current = null;
      setToken('');
    };
  }, [containerRef, siteKey, lang]);

  const reset = useCallback(() => {
    if (widgetRef.current !== null) window.turnstile?.reset(widgetRef.current);
    setToken('');
  }, []);

  return { token, reset, failed };
}
