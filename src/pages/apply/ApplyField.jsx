import { formatCopy } from '../../config/i18n';

/**
 * ApplyField — label + control + help / counter / error / live-check row for the /apply form.
 * `children` is the control; it must use `id={name}` so the label targets it.
 */
export default function ApplyField({ name, copy, error, optional, wide, counter, status, children }) {
  const field = copy.fields[name];
  const errorText = error && (error === 'invalid' ? copy.fieldErrors.invalid[name] : copy.fieldErrors[error]);

  return (
    <div className={`apply-field${wide ? ' apply-field--wide' : ''}${error ? ' is-invalid' : ''}`}>
      <label className="apply-field__label" htmlFor={name}>
        {field.label}
        {optional && <span className="apply-field__optional">{copy.optional}</span>}
      </label>
      {children}
      <div className="apply-field__meta">
        <span className="apply-field__help">
          {errorText ? <span className="apply-field__error">{errorText}</span> : status || field.help}
        </span>
        {counter && (
          <span className="apply-field__counter">
            {formatCopy(copy.counter, counter)}
          </span>
        )}
      </div>
    </div>
  );
}
