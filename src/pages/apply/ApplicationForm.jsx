import { useRef, useState } from 'react';
import ApplyField from './ApplyField';
import CheckStatus from './CheckStatus';
import RepoPicker from './RepoPicker';
import { useGrantCheck } from './useGrantCheck';
import { useTurnstile } from './useTurnstile';
import {
  AMOUNT_MAX_USD, AMOUNT_MIN_USD, APPLICANT_TYPES, LONG_TEXT_MAX, SHORT_TEXT_MAX,
  parseVideoUrl, validateApplication,
} from '../../config/grantForm';

const EMPTY = {
  name: '', email: '', applicantType: '', repoUrl: '',
  result: '', grantUse: '', amount: '', videoUrl: '', referrer: '',
};
const NO_REPOS = [];
// Focus order when the first invalid field is jumped to on submit.
const FIELD_ORDER = Object.keys(EMPTY);

/**
 * ApplicationForm — the /apply form. Locked until `account` (the signed-in GitHub account) is eligible;
 * the Turnstile widget only mounts once unlocked, and unmounting the form removes it.
 */
export default function ApplicationForm({ copy, lang, siteKey, account, onDone }) {
  const formRef = useRef(null);
  const turnstileRef = useRef(null);
  const [values, setValues] = useState(EMPTY);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [videoCheck, runVideoCheck] = useGrantCheck('video');
  const unlocked = account?.status === 'ready' && account.eligible;
  const turnstile = useTurnstile(turnstileRef, unlocked ? siteKey : null, lang);

  const onChange = (event) => {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => (prev[name] ? { ...prev, [name]: undefined } : prev));
    if (name === 'videoUrl') runVideoCheck(null);
  };

  // On blur: flag format problems of non-empty fields, then run the live checks they unlock.
  const onBlur = (event) => {
    const { name } = event.target;
    if (values[name].trim()) {
      const error = validateApplication(values).errors[name];
      if (error) setFieldErrors((prev) => ({ ...prev, [name]: error }));
    }
    if (name === 'videoUrl') {
      runVideoCheck(parseVideoUrl(values.videoUrl) ? { video: values.videoUrl.trim() } : null);
    }
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    const { errors } = validateApplication(values);
    const firstInvalid = FIELD_ORDER.find((name) => errors[name]);
    setFieldErrors(errors);
    if (firstInvalid) {
      setFormError('invalid_fields');
      // repoUrl is a select until "Other repository URL" reveals the input.
      const { elements } = formRef.current;
      (elements[firstInvalid] ?? (firstInvalid === 'repoUrl' ? elements.repoChoice : null))?.focus?.();
      return;
    }
    if (!turnstile.token) {
      setFormError('turnstile_pending');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const response = await fetch('/api/grants/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, turnstileToken: turnstile.token }),
      });
      const body = await response.json().catch(() => ({}));
      if (response.ok && body.ok) {
        onDone();
        return;
      }
      if (body.fields) setFieldErrors(body.fields);
      setFormError(body.error || 'network');
    } catch {
      setFormError('network');
    }
    // Turnstile tokens are single-use: any failed attempt needs a fresh challenge.
    turnstile.reset();
    setSubmitting(false);
  };

  const input = (name, extra) => (
    <input
      id={name}
      name={name}
      className="apply-input"
      value={values[name]}
      placeholder={copy.fields[name].placeholder}
      aria-invalid={Boolean(fieldErrors[name])}
      onChange={onChange}
      onBlur={onBlur}
      {...extra}
    />
  );

  const textarea = (name) => (
    <ApplyField name={name} copy={copy} error={fieldErrors[name]} wide counter={{ count: values[name].length, max: LONG_TEXT_MAX }}>
      <textarea
        id={name}
        name={name}
        className="apply-input apply-input--area"
        rows={5}
        maxLength={LONG_TEXT_MAX}
        value={values[name]}
        placeholder={copy.fields[name].placeholder}
        aria-invalid={Boolean(fieldErrors[name])}
        onChange={onChange}
        onBlur={onBlur}
      />
    </ApplyField>
  );

  const errorMessage = formError && (copy.errors[formError] || copy.errors.network);

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate>
      <fieldset className="apply-form" disabled={!unlocked}>
        <section className="apply-group">
          <h2 className="apply-group__title"><span>02</span>{copy.sections.you}</h2>
          <ApplyField name="name" copy={copy} error={fieldErrors.name}>
            {input('name', { autoComplete: 'name', maxLength: SHORT_TEXT_MAX })}
          </ApplyField>
          <ApplyField name="email" copy={copy} error={fieldErrors.email}>
            {input('email', { type: 'email', autoComplete: 'email', inputMode: 'email' })}
          </ApplyField>
          <div className={`apply-field apply-field--wide${fieldErrors.applicantType ? ' is-invalid' : ''}`} role="radiogroup" aria-labelledby="applicantType-label">
            <span id="applicantType-label" className="apply-field__label">{copy.fields.applicantType.label}</span>
            <div className="apply-choice">
              {APPLICANT_TYPES.map((type) => (
                <label key={type} className={`apply-choice__option${values.applicantType === type ? ' is-selected' : ''}`}>
                  <input type="radio" name="applicantType" value={type} checked={values.applicantType === type} onChange={onChange} />
                  {copy.fields.applicantType.options[type]}
                </label>
              ))}
            </div>
            {fieldErrors.applicantType && (
              <div className="apply-field__meta">
                <span className="apply-field__error">{copy.fieldErrors[fieldErrors.applicantType]}</span>
              </div>
            )}
          </div>
        </section>

        <section className="apply-group">
          <h2 className="apply-group__title"><span>03</span>{copy.sections.work}</h2>
          <RepoPicker
            copy={copy}
            repos={unlocked ? account.repos : NO_REPOS}
            value={values.repoUrl}
            error={fieldErrors.repoUrl}
            onChange={onChange}
            onBlur={onBlur}
          />
          {textarea('result')}
        </section>

        <section className="apply-group">
          <h2 className="apply-group__title"><span>04</span>{copy.sections.ask}</h2>
          {textarea('grantUse')}
          <ApplyField name="amount" copy={copy} error={fieldErrors.amount}>
            {input('amount', { type: 'number', inputMode: 'numeric', min: AMOUNT_MIN_USD, max: AMOUNT_MAX_USD, step: 1 })}
          </ApplyField>
          <ApplyField
            name="videoUrl"
            copy={copy}
            error={fieldErrors.videoUrl}
            optional
            status={videoCheck.status !== 'idle' && <CheckStatus state={videoCheck} copy={copy} />}
          >
            {input('videoUrl', { type: 'url', inputMode: 'url', autoCapitalize: 'none', spellCheck: false })}
          </ApplyField>
          <ApplyField name="referrer" copy={copy} error={fieldErrors.referrer} optional wide>
            {input('referrer', { maxLength: SHORT_TEXT_MAX })}
          </ApplyField>
        </section>

        <div className="apply-submit">
          <div ref={turnstileRef} className="apply-turnstile" />
          {turnstile.failed && <p className="apply-submit__error">{copy.loadError}</p>}
          <button type="submit" className="apply-button" disabled={submitting}>
            {submitting ? copy.submitting : copy.submit}
          </button>
          {errorMessage && <p className="apply-submit__error" role="alert">{errorMessage}</p>}
        </div>
      </fieldset>
    </form>
  );
}
