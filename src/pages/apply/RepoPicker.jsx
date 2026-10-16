import { useMemo, useState } from 'react';
import ApplyField from './ApplyField';
import CheckStatus from './CheckStatus';
import SelectMenu from './SelectMenu';
import { useGrantCheck } from './useGrantCheck';
import { parseRepoUrl } from '../../config/grantForm';

const OTHER = 'other';

/**
 * RepoPicker — project repo field: a custom select (SelectMenu) of the signed-in user's own repos plus "Other repository URL",
 * which reveals a URL input verified on blur (owner / contributor check against the session account).
 * Reports changes through the form's `onChange` / `onBlur` handlers as the `repoUrl` field.
 */
export default function RepoPicker({ copy, repos, value, error, onChange, onBlur }) {
  const [choice, setChoice] = useState('');
  const [check, runCheck] = useGrantCheck('repo');
  const isOther = choice === OTHER;
  const field = copy.fields.repoChoice;
  const options = useMemo(
    () => [...repos.map((repo) => ({ value: repo.url, label: repo.fullName })), { value: OTHER, label: field.other }],
    [repos, field.other],
  );

  const onSelect = (next) => {
    setChoice(next);
    runCheck(null);
    onChange({ target: { name: 'repoUrl', value: next === OTHER ? '' : next } });
  };

  const onUrlChange = (event) => {
    runCheck(null);
    onChange(event);
  };

  const onUrlBlur = (event) => {
    onBlur(event);
    runCheck(parseRepoUrl(value) ? { repo: value.trim() } : null);
  };

  return (
    <>
      <ApplyField name="repoChoice" copy={copy} error={isOther ? undefined : error} wide={!isOther}>
        <SelectMenu
          id="repoChoice"
          options={options}
          value={choice}
          placeholder={field.placeholder}
          invalid={Boolean(error) && !isOther}
          onSelect={onSelect}
        />
      </ApplyField>
      {isOther && (
        <ApplyField
          name="repoUrl"
          copy={copy}
          error={error}
          status={check.status !== 'idle' && <CheckStatus state={check} copy={copy} />}
        >
          <input
            id="repoUrl"
            name="repoUrl"
            className="apply-input"
            type="url"
            inputMode="url"
            autoCapitalize="none"
            spellCheck={false}
            value={value}
            placeholder={copy.fields.repoUrl.placeholder}
            aria-invalid={Boolean(error)}
            onChange={onUrlChange}
            onBlur={onUrlBlur}
          />
        </ApplyField>
      )}
    </>
  );
}
