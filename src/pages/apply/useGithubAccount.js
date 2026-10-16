import { useCallback, useEffect, useState } from 'react';

export const GITHUB_LOGIN_PATH = '/api/grants/github/login';

/**
 * useGithubAccount — the signed-in GitHub account from GET /api/grants/github/me (aborted on unmount).
 * State: { status: 'loading' | 'signedOut' | 'error', error? } or { status: 'ready', login, avatar, eligible, repos }.
 * `switchAccount` clears the session, then restarts sign-in with GitHub's account picker.
 */
export function useGithubAccount() {
  const [account, setAccount] = useState({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/grants/github/me', { signal: controller.signal })
      .then(async (response) => {
        if (response.status === 401) {
          setAccount({ status: 'signedOut' });
          return;
        }
        const body = await response.json().catch(() => ({}));
        setAccount(response.ok ? { status: 'ready', ...body } : { status: 'error', error: body.error || 'network' });
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setAccount({ status: 'error', error: 'network' });
      });
    return () => controller.abort();
  }, []);

  const switchAccount = useCallback(async () => {
    // The page navigates away right after, so there is nothing to abort.
    await fetch('/api/grants/github/logout', { method: 'POST' }).catch(() => {});
    window.location.assign(`${GITHUB_LOGIN_PATH}?switch=1`);
  }, []);

  return { account, switchAccount };
}
