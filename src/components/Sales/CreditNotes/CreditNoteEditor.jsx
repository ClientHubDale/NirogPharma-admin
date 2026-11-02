import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Loader2, Pencil, Printer, Send } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Modal } from '@/components/common/Modal'
import { FormDrawer } from '@/components/data/FormDrawer'
import { BillTemplate } from '@/components/Settings/components/BillTemplate'
import { useToast } from '@/components/common/Toast'
import { cn } from '@/lib/utils'
import { SearchSelect } from '@/components/form/SearchSelect'
import { Button } from '@/components/ui/button'
import { useItems } from '@/hooks/useItems'
import { usePriceTiers } from '@/hooks/usePriceTiers'
import { formatINR } from '@/lib/format'
import * as creditNotesService from '@/services/creditNotesService'
import * as stockService from '@/services/stockService'
import { selectUser } from '@/store/authSlice'
import { fetchDistributors, selectDistributors } from '@/store/distributorsSlice'
import { fetchSettings, saveSettingsGroup, selectBank, selectCompanySettings, selectInvoiceSettings } from '@/store/settingsSlice'
import { BILL_COPIES } from '@/components/Sales/Invoices/components/InvoicePrint/billFormat'
import { letterheadFor } from '@/lib/letterhead'
import { CreditNotePrint } from './components/CreditNotePrint'
import { CreditNoteLines } from './components/CreditNoteLines'
import {
  basePathFor,
  creditNoteToForm,
  emptyCreditNoteForm,
  formToPayload,
  previewLine,
  previewTotals,
  validateCreditNoteForm,
} from './creditNoteModel'

/** Form field → input id, to focus the first problem on Save. */
const FIELD_IDS = {
  distributorId: 'note-distributor',
  at: 'note-date',
  noteNo: 'note-no',
}

/** An input sitting on the note: plain, boxed, the sheet's own type size. */
const FIELD =
  'w-full rounded-[2px] border border-black/40 bg-white px-1 py-px text-[9px] outline-none focus:border-green-deep disabled:border-black/20 disabled:bg-bg disabled:text-ink-muted'

/**
 * Making a credit note.
 *
 * **Save records it. Issue sends it.** It follows the bill deliberately, and
 * for the same reason the client gave: "जैसे हमने इनवाइस इशू किया, वो सारे
 * स्टॉक को अफेक्ट करे — ऐसे ही क्रेडिट नोट का भी." Saving only writes the
 * paperwork; issuing is what brings the goods back onto our shelf under this
 * note's number, and it asks first.
 *
 * The create screen *is* the note: the printed sheet with inputs dropped into
 * it, so what is typed is literally what comes out of the printer.
 */
export default function CreditNoteEditor() {
  const { noteId } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const toast = useToast()
  const base = basePathFor(useLocation().pathname)

  const distributors = useSelector(selectDistributors)
  // A distributor writes their own notes; only the office issues one, because
  // issuing is what moves our stock, and only the office owns the letterhead.
  const isOffice = useSelector(selectUser)?.role !== 'DISTRIBUTOR'
  const bank = useSelector(selectBank)
  const companySettings = useSelector(selectCompanySettings)
  const rules = useSelector(selectInvoiceSettings)
  const items = useItems()
  const tiers = usePriceTiers()

  const [form, setForm] = useState(emptyCreditNoteForm)
  const [errors, setErrors] = useState({ lines: [] })
  const [saved, setSaved] = useState(null) // the note as the server last priced it
  const [loading, setLoading] = useState(Boolean(noteId))
  const [saving, setSaving] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [reviewing, setReviewing] = useState(Boolean(noteId))
  const [copyChoice, setCopyChoice] = useState('all')
  const [nextNo, setNextNo] = useState('')

  // What this distributor is holding, which is what a line may credit back.
  const [holdings, setHoldings] = useState([])

  // Template drawer, the same one the bill opens.
  const [template, setTemplate] = useState(null)
  const [savingTemplate, setSavingTemplate] = useState(false)

  const issued = saved?.status === 'ISSUED' || saved?.status === 'CANCELLED'

  useEffect(() => {
    dispatch(fetchDistributors())
    dispatch(fetchSettings())
  }, [dispatch])

  // The number the note will carry, shown before it is saved.
  useEffect(() => {
    if (noteId) return
    creditNotesService
      .nextNoteNo()
      .then(setNextNo)
      .catch(() => setNextNo(''))
  }, [noteId])

  useEffect(() => {
    if (!noteId) return
    let alive = true
    creditNotesService
      .getCreditNote(noteId)
      .then((note) => {
        if (!alive) return
        setSaved(note)
        setForm(creditNoteToForm(note))
      })
      .catch(() => alive && toast({ tone: 'danger', title: 'That credit note could not be opened.' }))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId])

  // Their holdings follow whoever the note is for.
  useEffect(() => {
    if (!form.distributorId) return setHoldings([])
    let alive = true
    stockService
      .listDistributorStock({ distributorId: form.distributorId })
      .then(({ rows }) => alive && setHoldings(rows ?? []))
      .catch(() => alive && setHoldings([]))
    return () => {
      alive = false
    }
  }, [form.distributorId])

  const update = (key, value) => {
    setForm((state) => ({ ...state, [key]: value }))
    setErrors((state) => ({ ...state, [key]: undefined }))
  }

  const firm = distributors.find((row) => row.id === form.distributorId)
  const tier = firm?.priceTier ?? 'MRP'

  /** What each line comes to, worked out the way the server works it out. */
  const priced = useMemo(
    () =>
      form.lines.map((line) =>
        line.itemId
          ? previewLine({ item: items.find((row) => row.id === line.itemId), tier, tiers, quantity: line.quantity })
          : null,
      ),
    [form.lines, items, tier, tiers],
  )
  const totals = useMemo(() => previewTotals(priced.filter(Boolean), form.otherCharges), [priced, form.otherCharges])

  /** How much of a batch they are still holding, for the line's own check. */
  const heldOf = (batchId) => {
    for (const row of holdings) {
      const batch = (row.batches ?? []).find((one) => one.batchId === batchId)
      if (batch) return Number(batch.outstanding)
    }
    return undefined
  }

  /** The note as the sheet wants it, whether saved or still being typed. */
  const asNote = useMemo(
    () => ({
      noteNo: form.noteNo || nextNo,
      at: form.at,
      status: 'PENDING',
      distributorId: form.distributorId,
      distributorName: firm?.name ?? '',
      distributorAddress: firm?.address ?? '',
      distributorState: firm?.state ?? '',
      distributorPincode: firm?.pincode ?? '',
      distributorGstin: firm?.gstin ?? '',
      interState: (firm?.state ?? 'UP').toUpperCase() !== 'UP',
      debitNoteNo: form.debitNoteNo,
      debitNoteDate: form.debitNoteDate,
      transport: form.transport,
      vehicleNo: form.vehicleNo,
      station: form.station,
      // No cgst/sgst/igst here on purpose: the sheet splits the tax off the
      // lines itself, and a zero passed in would print as a zero.
      ...totals,
      lines: form.lines
        .map((line, index) => {
          const item = items.find((row) => row.id === line.itemId)
          if (!item) return null
          const figures = priced[index] ?? {}
          return {
            id: `line-${index}`,
            itemName: item.name,
            hsn: item.hsn ?? '',
            boxes: line.boxes === '' ? null : Number(line.boxes),
            quantity: Number(line.quantity) || 0,
            ...figures,
          }
        })
        .filter(Boolean),
    }),
    [form, firm, items, priced, totals, nextNo],
  )

  const save = async () => {
    const { errors: found, ok } = validateCreditNoteForm(form, heldOf)
    setErrors(found)
    if (!ok) {
      const first = Object.keys(FIELD_IDS).find((key) => found[key])
      if (first) document.getElementById(FIELD_IDS[first])?.focus()
      return
    }

    setSaving(true)
    try {
      const note = saved
        ? await creditNotesService.updateCreditNote(saved.id, formToPayload(form))
        : await creditNotesService.createCreditNote(formToPayload(form))
      setSaved(note)
      setForm(creditNoteToForm(note))
      toast({ tone: 'success', title: `${note.noteNo} saved` })
      navigate(base)
    } catch (e) {
      const { message, details } = creditNotesService.errorFrom(e)
      setErrors((state) => ({ ...state, ...(details ?? {}) }))
      toast({ tone: 'danger', title: message })
    } finally {
      setSaving(false)
    }
  }

  const issue = async () => {
    setConfirming(false)
    setSaving(true)
    try {
      const note = await creditNotesService.issueCreditNote(saved.id)
      setSaved(note)
      setReviewing(true)
      toast({ tone: 'success', title: `${note.noteNo} issued — the stock is back with us` })
    } catch (e) {
      toast({ tone: 'danger', title: creditNotesService.errorFrom(e).message })
    } finally {
      setSaving(false)
    }
  }

  const saveTemplate = async () => {
    setSavingTemplate(true)
    try {
      await dispatch(saveSettingsGroup({ group: 'company', patch: template.company })).unwrap()
      await dispatch(saveSettingsGroup({ group: 'bank', patch: template.bank })).unwrap()
      toast({ tone: 'success', title: 'Bill template saved' })
      setTemplate(null)
    } catch {
      toast({ tone: 'danger', title: 'Could not save the template.' })
    } finally {
      setSavingTemplate(false)
    }
  }

  /** Which copy to print, chosen right where it prints. */
  const copyPicker = (
    <select
      id="note-copy"
      aria-label="Which copy to print"
      value={copyChoice}
      onChange={(e) => setCopyChoice(e.target.value)}
      className={cn(FIELD, 'mt-px w-48 print:hidden')}
    >
      {BILL_COPIES.map((copy) => (
        <option key={copy.value} value={copy.value}>
          {copy.label}
        </option>
      ))}
    </select>
  )

  if (loading) {
    return (
      <div className="grid min-h-60 place-items-center" role="status" aria-label="Loading credit note">
        <span className="size-8 animate-spin rounded-full border-3 border-mint border-t-green-deep" />
      </div>
    )
  }

  const sheet = reviewing && saved ? saved : asNote
  /**
   * A note that exists prints the letterhead it was written with; one still
   * being typed shows today's, which is what the next save will copy onto it.
   */
  const paper = letterheadFor(reviewing && saved ? saved : null, {
    company: companySettings,
    bank,
    invoice: rules,
  })

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            to={base}
            className="grid size-9 place-items-center rounded-xl border border-mint-pale text-ink-muted hover:bg-bg"
            aria-label="Back to credit notes"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-black">{saved ? saved.noteNo : 'Create Credit Note'}</h1>
            <p className="text-sm text-ink-muted">
              {issued
                ? 'This note has gone out — the goods are back on our books.'
                : isOffice
                  ? 'Save records the note. Issue is what brings the stock back.'
                  : 'Save records the note. The office issues it, which is what moves the stock.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() =>
              window.open(
                saved
                  ? `${base}/${saved.id}/print?print=1&copy=${copyChoice}`
                  : '',
                '_blank',
                'noopener',
              )
            }
            disabled={!saved}
          >
            <Printer data-icon="inline-start" /> PDF
          </Button>
          {isOffice && (
            <Button variant="outline" onClick={() => setTemplate({ company: companySettings, bank })}>
              <Pencil data-icon="inline-start" /> Edit bill template
            </Button>
          )}
          {reviewing && saved && !issued && (
            <Button variant="outline" onClick={() => setReviewing(false)}>
              Edit
            </Button>
          )}
          {!issued && !reviewing && (
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="animate-spin" data-icon="inline-start" />}
              Save
            </Button>
          )}
          {isOffice && saved && !issued && (
            <Button onClick={() => setConfirming(true)} disabled={saving}>
              <Send data-icon="inline-start" /> Issue
            </Button>
          )}
        </div>
      </div>

      <div id="bill-sheet" className="rounded-2xl border border-mint-pale bg-white p-4 sm:p-6">
        <CreditNotePrint
          note={sheet}
          bank={paper.bank}
          company={paper.company}
          taxRate={paper.taxRate}
          slots={
            reviewing && saved
              ? { copyChoice: copyPicker }
              : {
                  copyChoice: copyPicker,
                  noteNo: (
                    <input
                      id="note-no"
                      aria-label="Credit note number"
                      placeholder={nextNo || 'CN/26-27/001'}
                      value={form.noteNo}
                      onChange={(e) => update('noteNo', e.target.value)}
                      disabled={Boolean(saved)}
                      className={cn(FIELD, errors.noteNo && 'border-destructive')}
                    />
                  ),
                  at: (
                    <input
                      id="note-date"
                      type="date"
                      aria-label="Credit note date"
                      value={form.at}
                      onChange={(e) => update('at', e.target.value)}
                      disabled={Boolean(saved)}
                      className={FIELD}
                    />
                  ),
                  debitNoteNo: (
                    <input
                      id="note-debit-no"
                      aria-label="Their debit note number"
                      value={form.debitNoteNo}
                      onChange={(e) => update('debitNoteNo', e.target.value)}
                      className={FIELD}
                    />
                  ),
                  debitNoteDate: (
                    <input
                      id="note-debit-date"
                      type="date"
                      aria-label="Their debit note date"
                      value={form.debitNoteDate}
                      onChange={(e) => update('debitNoteDate', e.target.value)}
                      className={FIELD}
                    />
                  ),
                  transport: (
                    <input
                      id="note-transport"
                      aria-label="Transport"
                      value={form.transport}
                      onChange={(e) => update('transport', e.target.value)}
                      className={FIELD}
                    />
                  ),
                  vehicleNo: (
                    <input
                      id="note-vehicle"
                      aria-label="Vehicle number"
                      value={form.vehicleNo}
                      onChange={(e) => update('vehicleNo', e.target.value)}
                      className={FIELD}
                    />
                  ),
                  station: (
                    <input
                      id="note-station"
                      aria-label="Station"
                      value={form.station}
                      onChange={(e) => update('station', e.target.value)}
                      className={FIELD}
                    />
                  ),
                  party: (
                    <div className="space-y-1 print:hidden">
                      <SearchSelect
                        id="note-distributor"
                        aria-label="Distributor"
                        options={distributors.map((row) => ({ value: row.id, label: row.name, hint: row.city || row.state }))}
                        value={form.distributorId}
                        limit={10}
                        placeholder="Choose the distributor…"
                        invalid={Boolean(errors.distributorId)}
                        onChange={(value) => update('distributorId', value)}
                      />
                      {errors.distributorId && <p className="text-[9px] text-destructive">{errors.distributorId}</p>}
                      {firm && (
                        <div className="text-[9px] leading-tight">
                          {firm.address && <p className="whitespace-pre-line">{firm.address}</p>}
                          <p className="font-bold">GSTIN- {firm.gstin || 'UNREGISTERED'}</p>
                        </div>
                      )}
                    </div>
                  ),
                  extraMeta: (
                    <div className="space-y-[1px] print:hidden">
                      {/* The bill the goods first went out on. Recorded, not
                          printed — their own note carries no such column. */}
                      <div className="grid grid-cols-[7.5rem_0.5rem_1fr] gap-x-1">
                        <span>AGAINST BILL</span>
                        <span>:</span>
                        <input
                          id="note-against"
                          aria-label="Against which bill"
                          placeholder="NP/26-27/673"
                          value={form.againstInvoiceNo}
                          onChange={(e) => update('againstInvoiceNo', e.target.value)}
                          className={FIELD}
                        />
                      </div>
                      <div className="grid grid-cols-[7.5rem_0.5rem_1fr] gap-x-1">
                        <span>OTHER CHARGES</span>
                        <span>:</span>
                        <input
                          id="note-other-charges"
                          aria-label="Other charges"
                          inputMode="decimal"
                          value={form.otherCharges}
                          onChange={(e) => update('otherCharges', e.target.value.replace(/[^\d.]/g, ''))}
                          className={FIELD}
                        />
                      </div>
                    </div>
                  ),
                  lines: (
                    <CreditNoteLines
                      form={form}
                      errors={errors}
                      items={items}
                      holdings={holdings}
                      priced={priced}
                      disabled={issued}
                      onChange={update}
                    />
                  ),
                }
          }
        />
      </div>

      <Modal
        open={confirming}
        onOpenChange={setConfirming}
        title={`Issue ${saved?.noteNo ?? 'this note'}?`}
        description="The goods come back onto our shelf and off the distributor's, under this note's number. It cannot be undone except by cancelling the note."
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button onClick={issue}>Issue the note</Button>
          </>
        }
      >
        <p className="text-sm text-ink-muted">
          {formatINR(saved?.total ?? 0)} will be credited back to {saved?.distributorName}.
        </p>
      </Modal>

      <FormDrawer
        open={Boolean(template)}
        onOpenChange={(open) => !open && setTemplate(null)}
        title="Edit bill template"
        description="What every printed bill and credit note says. The layout stays the same; these are the words on it."
        onSubmit={saveTemplate}
        saving={savingTemplate}
        saveLabel="Save template"
        wide
      >
        {template && (
          <BillTemplate
            company={template.company}
            bank={template.bank}
            onChange={(key, value) => setTemplate((state) => ({ ...state, company: { ...state.company, [key]: value } }))}
            onChangeBank={(key, value) => setTemplate((state) => ({ ...state, bank: { ...state.bank, [key]: value } }))}
          />
        )}
      </FormDrawer>
    </div>
  )
}
