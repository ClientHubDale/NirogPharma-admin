import { Gift, Info } from 'lucide-react'
import { Modal } from '@/components/common/Modal'
import { Button } from '@/components/ui/button'

/** Result of "Apply Scheme": what applied, or why nothing did. */
export function SchemeResultDialog({ result, onClose }) {
  return (
    <Modal
      open={Boolean(result)}
      onOpenChange={(o) => !o && onClose()}
      title={result?.applied.length ? `${result.applied.length} scheme${result.applied.length === 1 ? '' : 's'} applied` : 'No scheme applied'}
      footer={<Button size="lg" onClick={onClose}>Done</Button>}
    >
      {result?.applied.length ? (
        <ul className="space-y-2">
          {result.applied.map((a) => (
            <li key={a.id} className="flex gap-3 rounded-xl border border-mint-pale bg-bg p-3">
              <Gift className="mt-0.5 size-4 shrink-0 text-green-deep" />
              <div>
                <p className="text-sm font-semibold text-black">{a.name}</p>
                <p className="text-sm text-ink-muted">{a.effect}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="flex gap-2.5 text-sm text-ink">
          <Info className="mt-0.5 size-4 shrink-0 text-green-deep" />
          {result?.checked
            ? `${result.checked} active scheme${result.checked === 1 ? '' : 's'} checked for this party and date — the items or quantities don’t qualify yet.`
            : 'There are no active schemes for this party group on this date.'}
        </p>
      )}
    </Modal>
  )
}
