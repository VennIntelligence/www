import { GITHUB_LOGIN_PATH } from './useGithubAccount';

/**
 * GithubConnect — step 01 of /apply: "Connect GitHub" (full-page OAuth redirect), then the connected
 * account with a switch link and either a go-ahead or the generic not-eligible message.
 * The gate's criteria are never shown; the applicant's own `stats` appear only while the server's
 * GRANT_SHOW_METRICS test flag is on (see worker/github.js).
 */
export default function GithubConnect({ copy, enabled, account, githubError, onSwitch }) {
  const errorCode = !enabled ? 'not_configured' : githubError || (account.status === 'error' && account.error);
  const errorText = errorCode && (copy.githubErrors[errorCode] || copy.githubErrors.exchange_failed);

  return (
    <section className="apply-group">
      <h2 className="apply-group__title"><span>01</span>{copy.sections.github}</h2>
      <p className="apply-group__note">{copy.github.note}</p>
      {errorText && <p className="apply-submit__error apply-field--wide" role="alert">{errorText}</p>}

      {enabled && account.status === 'loading' && (
        <p className="apply-check apply-check--pending apply-field--wide">{copy.github.checking}</p>
      )}

      {enabled && (account.status === 'signedOut' || account.status === 'error') && (
        <a className="apply-button apply-github__connect" href={GITHUB_LOGIN_PATH}>{copy.github.connect}</a>
      )}

      {account.status === 'ready' && (
        <div className="apply-github">
          <div className="apply-github__who">
            <img className="apply-github__avatar" src={account.avatar} alt="" width={40} height={40} loading="lazy" referrerPolicy="no-referrer" />
            <a className="apply-github__login" href={`https://github.com/${account.login}`} target="_blank" rel="noopener noreferrer">@{account.login}</a>
            <button type="button" className="apply-github__switch" onClick={onSwitch}>{copy.github.switch}</button>
          </div>
          {account.stats && (
            <dl className="apply-github__stats">
              {Object.keys(copy.github.stats).map((key) => (
                <div key={key}>
                  <dt>{copy.github.stats[key]}</dt>
                  <dd>{account.stats[key].toLocaleString()}</dd>
                </div>
              ))}
            </dl>
          )}
          <p className={`apply-check ${account.eligible ? 'apply-check--ok' : 'apply-check--error'}`} role="status">
            {account.eligible ? copy.github.eligible : copy.github.ineligible}
          </p>
        </div>
      )}
    </section>
  );
}
