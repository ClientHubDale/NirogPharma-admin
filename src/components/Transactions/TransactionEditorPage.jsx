import { useLocation, useParams } from 'react-router-dom'
import TransactionEditor from './TransactionEditor'

/**
 * Route element for every sales editor (`<basePath>/new`, `<basePath>/:docId/edit`).
 * Remounts per document so forms never show stale data.
 */
export default function TransactionEditorPage({ type }) {
  const { docId } = useParams()
  const { state } = useLocation()
  const from = state?.convertFrom
  return (
    <TransactionEditor
      key={`${type}-${docId ?? `new-${state?.duplicateOf ?? ''}-${from ? `${from.type}:${from.id}` : ''}`}`}
      type={type}
      docId={docId}
      duplicateOf={state?.duplicateOf}
      convertFrom={from}
    />
  )
}
