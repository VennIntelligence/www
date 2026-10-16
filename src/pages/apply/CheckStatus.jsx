import { formatCopy } from '../../config/i18n';

/** CheckStatus — inline outcome of a non-idle live repo / video verification (see useGrantCheck). */
export default function CheckStatus({ state, copy }) {
  if (state.status === 'checking') {
    return <span className="apply-check apply-check--pending">{copy.verify.checking}</span>;
  }

  const { result } = state;
  if (!result.ok) {
    return <span className="apply-check apply-check--error">{copy.errors[result.error] || copy.errors.network}</span>;
  }

  let text;
  if (result.relation) {
    text = `${formatCopy(copy.verify.repoOk, { name: result.fullName })} · ${copy.verify.relation[result.relation]}`;
  } else {
    text = result.title ? formatCopy(copy.verify.videoOk, { title: result.title }) : copy.verify.videoOkUntitled;
  }
  return <span className="apply-check apply-check--ok">{text}</span>;
}
