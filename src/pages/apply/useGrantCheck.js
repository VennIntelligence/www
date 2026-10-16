import { useCallback, useEffect, useRef, useState } from 'react';

const IDLE = { status: 'idle' };

/**
 * useGrantCheck — one live verification slot (`'repo'` or `'video'`) backed by GET /api/grants/verify.
 * Each new run aborts the previous request; the pending request is aborted on unmount.
 * State: { status: 'idle' | 'checking' | 'done', result? }.
 */
export function useGrantCheck(kind) {
  const [state, setState] = useState(IDLE);
  const controllerRef = useRef(null);

  const run = useCallback((params) => {
    controllerRef.current?.abort();
    if (!params) {
      controllerRef.current = null;
      setState(IDLE);
      return;
    }

    const controller = new AbortController();
    controllerRef.current = controller;
    setState({ status: 'checking' });

    fetch(`/api/grants/verify?${new URLSearchParams(params)}`, { signal: controller.signal })
      .then((response) => response.json().catch(() => ({})).then((body) => ({ response, body })))
      .then(({ response, body }) => {
        const result = response.ok ? body[kind] : { ok: false, error: body.error || 'network' };
        setState(result ? { status: 'done', result } : IDLE);
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setState({ status: 'done', result: { ok: false, error: 'network' } });
      });
  }, [kind]);

  useEffect(() => () => controllerRef.current?.abort(), []);

  return [state, run];
}
