import { useEffect, useState } from 'react'
import { ArrowLeft, Loader2, Send } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Modal } from '@/components/common/Modal'
import { useToast } from '@/components/common/Toast'
import { TextAreaField } from '@/components/form/TextAreaField'
import { Button } from '@/components/ui/button'
import { useItems } from '@/hooks/useItems'
import { formatINR } from '@/lib/format'
import * as invoicesService from '@/services/invoicesService'
import { fetchDistributors, selectDistributors } from '@/store/distributorsSlice'
import { issueInvoice, saveInvoice } from '@/store/invoicesSlice'
import { fetchBatches, selectBatches } from '@/store/stockSlice'
import { usePriceTiers } from '@/hooks/usePriceTiers'
import { InvoiceBillTo } from './components/InvoiceBillTo'
import { InvoiceLines } from './components/InvoiceLines'
import {
  emptyInvoiceForm,
  formToPayload,
  invoiceToForm,
  previewLine,
  previewTotals,
  validateInvoiceForm,
} from './invoiceModel'

/** Form field → input id, to focus the first problem on Save. */
const FIELD_IDS = {
  invoiceNo: 'invoice-no',
  distributorId: 'invoice-distributor',
  invoiceDate: 'invoice-date',
  creditDays: 'invoice-credit-days',
}

/**
 * Making a bill.
 *
 * **Save records it. Issue sends it.** Saving only writes the paperwork;
 * issuing is what takes the stock out of the factory, under this invoice
 * number, and it asks first — "एक बार गलती से हो गया तो वो तो चला गया".
 *
 * The money is the server's: it prices every line from the distributor's own
 * rate column, takes the GST back out of that price, and splits the tax into
 * CGST + SGST or IGST depending on where the firm is. What is shown here while
 * typing is the server's answer from the last save.
 */
export default function InvoiceEditor() {
  const { invoiceId } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const toast = useToast()

  const distributors = useSelector(selectDistributors)
  const batches = useSelector(selectBatches)
  const items = useItems()
  const tiers = usePriceTiers()

  const [form, setForm] = useState(emptyInvoiceForm)
  const [errors, setErrors] = useState({})
  const [saved, setSaved] = useState(null) // the bill as the server last priced it
  const [loading, setLoading] = useState(Boolean(invoiceId))
  const [saving, setSaving] = useState(false)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    dispatch(fetchDistributors())
    dispatch(fetchBatches({}))
  }, [dispatch])

  useEffect(() => {
    if (!invoiceId) return
    let alive = true
    invoicesService
      .getInvoice(invoiceId)
      .then((invoice) => {
        if (!alive) return
        setSaved(invoice)
        setForm(invoiceToForm(invoice))
        setLoading(false)
      })
      .catch(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [invoiceId])

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }))
  }

  const firm = distributors.find((row) => row.id === form.distributorId)
  const issued = saved && saved.status !== 'PENDING'
  // Whether what is on screen still matches what the server last priced.
  const isDirty = !saved || JSON.stringify(formToPayload(form)) !== JSON.stringify(formToPayload(invoiceToForm(saved)))

  /** Only batches of that item, and only ones with something in them. */
  const batchesFor = (itemId) => batches.filter((batch) => batch.itemId === itemId && batch.available > 0)
  const availableOf = (batchId) => batches.find((row) => row.id === batchId)?.available ?? 0

  /** The bill as it stands, priced in the browser the way the server will. */
  const totals = previewTotals(
    form.lines
      .filter((line) => line.itemId)
      .map((line) => previewLine({ item: items.find((row) => row.id === line.itemId), tier: firm?.priceTier, tiers, quantity: line.quantity })),
  )

  /**
   * `goBack` is false only when Issue calls this first — it needs the saved
   * bill in hand before it can send it, and leaving the page mid-way would
   * lose the issue.
   */
  const save = async ({ goBack = true } = {}) => {
    const found = validateInvoiceForm(form, availableOf)
    if (Object.keys(found).length) {
      setErrors(found)
      document.getElementById(FIELD_IDS[Object.keys(found)[0]])?.focus()
      return null
    }

    setSaving(true)
    const result = await dispatch(saveInvoice({ id: invoiceId, form: formToPayload(form) }))
    setSaving(false)

    if (saveInvoice.rejected.match(result)) {
      const { message, details } = result.payload
      if (details) setErrors((current) => ({ ...current, ...details }))
      toast({ tone: 'danger', title: 'Could not save', description: message })
      return null
    }

    const invoice = result.payload.invoice
    setSaved(invoice)

    if (goBack) {
      navigate('/admin/sales/invoices', {
        state: {
          notice: { tone: 'success', message: `Invoice ${invoice.invoiceNo} saved — ${formatINR(invoice.total)}.` },
          highlightId: invoice.id,
        },
      })
    }
    return invoice
  }

  const issue = async () => {
    setConfirming(false)
    // Save whatever is on screen first, so what goes out is what is shown.
    const invoice = saved?.status === 'PENDING' && !isDirty ? saved : await save({ goBack: false })
    if (!invoice) return

    setSaving(true)
    const result = await dispatch(issueInvoice({ id: invoice.id }))
    setSaving(false)

    if (issueInvoice.rejected.match(result)) {
      return toast({ tone: 'danger', title: 'Could not issue', description: result.payload.message })
    }
    setSaved(result.payload.invoice)
    dispatch(fetchBatches({}))
    navigate('/admin/sales/invoices', {
      state: {
        notice: {
          tone: 'success',
          message: `Invoice ${result.payload.invoice.invoiceNo} issued — the stock is out of the factory.`,
        },
        highlightId: result.payload.invoice.id,
      },
    })
  }

  if (loading) {
    return (
      <div className="grid min-h-60 place-items-center" role="status" aria-label="Loading invoice">
        <span className="size-8 animate-spin rounded-full border-3 border-mint border-t-green-deep" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-10">
      <div className="sticky top-16 z-10 -mx-4 flex flex-col gap-3 border-b border-mint-pale bg-bg/90 px-4 py-3 backdrop-blur sm:mx-0 sm:flex-row sm:items-center sm:justify-between sm:rounded-2xl sm:border sm:bg-white/90 sm:px-5">
        <div className="min-w-0">
          <Link to="/admin/sales/invoices" className="inline-flex items-center gap-1 text-xs font-semibold text-green-deep hover:underline">
            <ArrowLeft className="size-3.5" /> Sales Invoices
          </Link>
          <h1 className="truncate text-2xl font-extrabold sm:text-3xl">
            {invoiceId ? 'Edit sales invoice' : 'Create Sales Invoice'}
            {form.invoiceNo && <span className="ml-2 font-mono text-base font-medium text-ink-muted">{form.invoiceNo}</span>}
          </h1>
          <p className="text-xs text-ink-muted">
            {issued ? `Issued · ${saved.status.toLowerCase()}` : 'Save records the bill. Issue takes the stock out of the factory.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="lg" onClick={() => navigate('/admin/sales/invoices')}>
            Cancel
          </Button>
          <Button type="button" variant="outline" size="lg" onClick={save} disabled={saving || issued}>
            {saving && <Loader2 className="animate-spin" data-icon="inline-start" />}
            Save
          </Button>
          <Button type="button" size="lg" onClick={() => setConfirming(true)} disabled={saving || issued}>
            <Send data-icon="inline-start" /> Issue
          </Button>
        </div>
      </div>

      <InvoiceBillTo
        form={form}
        errors={errors}
        distributors={distributors}
        firm={firm}
        onChange={update}
        disabled={issued}
      />

      <InvoiceLines
        form={form}
        errors={errors}
        items={items}
        batchesFor={batchesFor}
        onChange={update}
        tier={firm?.priceTier}
        tiers={tiers}
        disabled={issued}
      />

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1fr_24rem]">
        <section className="space-y-4 rounded-2xl border border-mint-pale bg-white p-5">
          <TextAreaField
            id="invoice-terms"
            label="Terms and conditions"
            rows={3}
            placeholder="Printed at the bottom of the bill"
            value={form.terms}
            onChange={(e) => update('terms', e.target.value)}
            disabled={issued}
          />
        </section>

        <section className="space-y-1.5 rounded-2xl border border-mint-pale bg-white p-5 text-sm">
          <p className="mb-2 text-xs font-bold tracking-wide text-ink-muted uppercase">Totals</p>
          <div className="flex justify-between">
            <span className="text-ink-muted">Taxable value</span>
            <span className="font-mono tabular-nums">{formatINR(totals.taxableValue)}</span>
          </div>
          {/* The split follows the firm's state: inside UP it is halved. */}
          {firm?.state && firm.state.toUpperCase() !== 'UP' ? (
            <div className="flex justify-between">
              <span className="text-ink-muted">IGST</span>
              <span className="font-mono tabular-nums">{formatINR(totals.taxAmount)}</span>
            </div>
          ) : (
            <>
              <div className="flex justify-between">
                <span className="text-ink-muted">CGST</span>
                <span className="font-mono tabular-nums">{formatINR(Math.round(totals.taxAmount * 50) / 100)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">SGST</span>
                <span className="font-mono tabular-nums">
                  {formatINR(Math.round((totals.taxAmount - Math.round(totals.taxAmount * 50) / 100) * 100) / 100)}
                </span>
              </div>
            </>
          )}
          <div className="flex justify-between">
            <span className="text-ink-muted">Round off</span>
            <span className="font-mono tabular-nums">{formatINR(totals.roundOff)}</span>
          </div>
          <div className="flex justify-between border-t border-mint-pale pt-2 text-base font-bold">
            <span>Total</span>
            <span className="font-mono tabular-nums">{formatINR(totals.total)}</span>
          </div>
          {saved?.dueDate && <p className="pt-1 text-right text-xs text-ink-muted">Due {saved.dueDate}</p>}
          {saved && isDirty && <p className="pt-1 text-right text-xs text-warning-ink">Not saved yet.</p>}
        </section>
      </div>

      <Modal
        open={confirming}
        onOpenChange={setConfirming}
        title="Issue this invoice?"
        description="The stock leaves the factory and goes onto the distributor's books. This cannot be undone — a mistake has to be cancelled afterwards."
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button onClick={issue}>Yes, issue it</Button>
          </>
        }
      >
        <p className="text-sm text-ink-muted">
          {form.lines.filter((line) => line.itemId).length} item
          {form.lines.filter((line) => line.itemId).length === 1 ? '' : 's'} to {firm?.name ?? 'the distributor'}
          {form.invoiceNo ? ` on ${form.invoiceNo}` : ''}.
        </p>
      </Modal>
    </div>
  )
}
