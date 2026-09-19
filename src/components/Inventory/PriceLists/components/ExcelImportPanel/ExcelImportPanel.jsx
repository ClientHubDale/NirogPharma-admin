import { useState } from 'react'
import { FileDown } from 'lucide-react'
import { Stepper } from '@/components/common/Stepper'
import { FileDropZone } from '@/components/form/FileDropZone'
import { Button } from '@/components/ui/button'

function StepCard({ title, children }) {
  return (
    <div className="flex flex-col rounded-xl border border-mint-pale bg-white p-5">
      <h3 className="text-lg font-bold">{title}</h3>
      <div className="mt-2 flex flex-1 flex-col text-sm leading-relaxed text-ink-muted">{children}</div>
    </div>
  )
}

/**
 * "Import from Excel": 1. export the catalog, 2. edit New Price, 3. drop the file back.
 * onExport() downloads the sheet; onImport(file) parses it (throw to show an error).
 */
export function ExcelImportPanel({ onExport, onImport }) {
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const exportCatalog = async () => {
    await onExport()
    setStep((s) => Math.max(s, 1))
  }

  const importFile = async (file) => {
    setError('')
    setBusy(true)
    try {
      await onImport(file)
      setStep(3)
    } catch (err) {
      setError(err?.message ?? 'Import failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <Stepper steps={['Export', 'Update', 'Import']} current={step} />
      <div className="grid gap-4 lg:grid-cols-3">
        <StepCard title="1. Export the catalog">
          <p>Download every item as a spreadsheet with brand, category and catalog price, ready to edit.</p>
          <Button type="button" size="lg" className="mt-4 w-full" onClick={exportCatalog}>
            <FileDown data-icon="inline-start" /> Export to Excel
          </Button>
        </StepCard>
        <StepCard title="2. Update prices">
          <p>
            Open the file and edit the <span className="font-semibold text-black">New Price</span> column for each item.
          </p>
          <ul className="mt-3 list-disc space-y-1.5 pl-5">
            <li>Keep the SKU column unchanged — it’s how items are matched</li>
            <li>Delete rows for items you don’t want in this list</li>
            <li>Leave New Price blank to keep the catalog price</li>
            <li>Prices above MRP are rejected</li>
          </ul>
        </StepCard>
        <StepCard title="3. Import the file">
          <FileDropZone busy={busy} onFile={importFile} onReject={setError} hint=".xlsx exported from step 1" />
          {error && (
            <p role="alert" className="mt-2 text-sm font-medium text-destructive">
              {error}
            </p>
          )}
        </StepCard>
      </div>
    </div>
  )
}
