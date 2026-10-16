import { Fragment, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Footer from '../components/Footer';
import ApplicationForm from './apply/ApplicationForm';
import GithubConnect from './apply/GithubConnect';
import { useGithubAccount } from './apply/useGithubAccount';
import { COPY } from '../config/i18n';
import { useLanguage } from '../context/useLanguage';
import '../styles/pages/apply.css';

/**
 * ApplyPage — grant application form (/apply).
 *
 * The Turnstile site key and GitHub sign-in availability come from GET /api/grants/config at runtime,
 * so rotating keys never needs a rebuild. The GitHub account loads in parallel; an OAuth failure
 * comes back as ?github_error=<code>, which is read once and stripped from the URL.
 */
export default function ApplyPage() {
  const { lang } = useLanguage();
  const copy = COPY.apply[lang];
  // { status: 'loading' | 'ready' | 'error', siteKey?, githubEnabled? }
  const [config, setConfig] = useState({ status: 'loading' });
  const { account, switchAccount } = useGithubAccount();
  const [searchParams, setSearchParams] = useSearchParams();
  const [githubError] = useState(() => searchParams.get('github_error'));
  const [done, setDone] = useState(false);
  const onDone = () => {
    setDone(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/grants/config', { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error('config_failed'))))
      .then(({ turnstileSiteKey, githubEnabled }) => {
        setConfig(turnstileSiteKey
          ? { status: 'ready', siteKey: turnstileSiteKey, githubEnabled }
          : { status: 'error' });
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setConfig({ status: 'error' });
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (githubError) setSearchParams({}, { replace: true });
  }, [githubError, setSearchParams]);

  return (
    <main className="apply-page">
      <div className="apply-page__inner">
        <header className="apply-hero">
          <p className="apply-hero__eyebrow">{copy.eyebrow}</p>
          <h1 className="apply-hero__title">
            {copy.titleLines.map((line, i) => (
              <Fragment key={i}>
                {i > 0 && <br />}
                <span className={i === copy.titleLines.length - 1 ? 'apply-hero__display' : undefined}>{line}</span>
              </Fragment>
            ))}
          </h1>
          <p className="apply-hero__lead">{copy.lead}</p>
          <ul className="apply-policies">
            {copy.policies.map((line) => <li key={line}>{line}</li>)}
          </ul>
        </header>

        {done ? (
          <section className="apply-done" role="status">
            <h2 className="apply-done__title">{copy.done.title}</h2>
            <p className="apply-done__body">{copy.done.body}</p>
            <Link to="/" className="apply-button">{copy.done.back}</Link>
          </section>
        ) : config.status === 'ready' ? (
          <div className="apply-flow">
            <GithubConnect
              copy={copy}
              enabled={config.githubEnabled}
              account={account}
              githubError={githubError}
              onSwitch={switchAccount}
            />
            <ApplicationForm copy={copy} lang={lang} siteKey={config.siteKey} account={account} onDone={onDone} />
          </div>
        ) : config.status === 'error' ? (
          <p className="apply-submit__error" role="alert">{copy.loadError}</p>
        ) : null}
      </div>
      <Footer />
    </main>
  );
}
