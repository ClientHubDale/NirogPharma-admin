import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, CheckCircle2, Loader2, Pencil, Printer, UserPlus } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Modal } from '@/components/common/Modal'
import { useToast } from '@/components/common/Toast'
import { FormDrawer } from '@/components/data/FormDrawer'
import { SearchSelect } from '@/components/form/SearchSelect'
import { BillTemplate } from '@/components/Settings/components/BillTemplate'
import { Button } from '@/components/ui/button'
import { useGifts } from '@/hooks/useGifts'
import { useItems } from '@/hooks/useItems'
import { usePriceTiers } from '@/hooks/usePriceTiers'
import { formatINR } from '@/lib/format'
import { letterheadFor } from '@/lib/letterhead'
import { cn } from '@/lib/utils'
import * as ordersService from '@/services/ordersService'
import * as schemesService from '@/services/schemesService'
import { DistributorForm } from '@/components/Parties/Distributors/components/DistributorForm'
import { emptyDistributorForm, validateDistributorForm } from '@/components/Parties/Distributors/distributorModel'
import { fetchDistributors, saveDistributor, selectDistributors } from '@/store/distributorsSlice'
import { selectCities, selectRegions, selectRoutes } from '@/store/geographySlice'
import { fetchUsers, selectUsers } from '@/store/usersSlice'
import { saveOrder, setOrderStatus } from '@/store/ordersSlice'
import { fetchSchemes, selectSchemes } from '@/store/schemesSlice'
import { fetchSettings, saveSettingsGroup, selectBank, selectCompanySettings, selectInvoiceSettings } from '@/store/settingsSlice'
import { nextRung } from '@/components/Inventory/Schemes/schemeModel'
import { InvoiceLines } from '../Invoices/components/InvoiceLines'
import { InvoicePrint } from '../Invoices/components/InvoicePrint'
import { SchemePanel } from '../Invoices/components/SchemePanel'
import {
  addressOf,
  emptyOrderForm,
  formToPayload,
  OPEN_STATUSES,
  orderToForm,
  previewLine,
  previewTotals,
  validateOrderForm,
} from './orderModel'

/** Form field → input id, to focus the first problem on Save. */
const FIELD_IDS = {
  orderNo: 'order-no',
  distributorId: 'order-distributor',
  orderDate: 'order-date',
  creditDays: 'order-credit-days',
}

/** An input sitting on the sheet: plain, boxed, the sheet's own type size. */
const FIELD =
  'w-full rounded-[2px] border border-black/40 bg-white px-1 py-px text-[9px] outline-none focus:border-green-deep disabled:border-black/20 disabled:bg-bg disabled:text-ink-muted'

/// The same input, sized for a normal card rather than for paper.
const SCREEN_FIELD =
  'w-full rounded-lg border border-mint bg-white px-3 py-2 text-sm outline-none focus:border-green-deep disabled:bg-bg disabled:text-ink-muted'

/**
 * Booking an order.
 *
 * It is the bill's own sheet, with SALES ORDER over it — the same letterhead,
 * the same lines table, the same scheme panel, the same totals — because an
 * order becomes a bill and the two should never look like different documents.
 *
 * **Save records it. Confirm is the customer agreeing to it.** Neither moves
 * any stock: an order names no batch and reserves nothing. The goods leave the
 * factory when the invoice made from this is issued, which is the one place
 * stock has ever moved.
 *
 * The money is the server's. It prices every line from the customer's own rate
 * column, takes the GST back out of that price, and splits the tax into
 * CGST + SGST or IGST depending on where the firm is — all of it the very same
 * code that prices a bill.
 */
export default function OrderEditor() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const toast = useToast()

  const distributors = useSelector(selectDistributors)
  // Everything a new customer needs to be a proper record, not half a one.
  const users = useSelector(selectUsers)
  const regions = useSelector(selectRegions)
  const cities = useSelector(selectCities)
  // Routes › Areas live under `routes` in the geography store.
  const areas = useSelector(selectRoutes)
  const items = useItems()
  const tiers = usePriceTiers()
  const bank = useSelector(selectBank)
  const companySettings = useSelector(selectCompanySettings)
  // An order prints on the bill's paper, so it follows the bill's switches.
  const rules = useSelector(selectInvoiceSettings)
  const schemes = useSelector(selectSchemes)
  const gifts = useGifts()

  const [form, setForm] = useState(emptyOrderForm)
  const [errors, setErrors] = useState({})
  const [saved, setSaved] = useState(null) // the order as the server last priced it
  const [loading, setLoading] = useState(Boolean(orderId))
  const [saving, setSaving] = useState(false)
  const [confirming, setConfirming] = useState(false)
  // An order that already exists opens as the document, filled in, with the
  // form a click away behind Edit — the way a saved bill does.
  const [reviewing, setReviewing] = useState(Boolean(orderId))

  const [template, setTemplate] = useState(null)
  const [savingTemplate, setSavingTemplate] = useState(false)

  /**
   * A customer who is not on the books yet — "अगर कस्टमर नहीं है तो वहीं से
   * ऐड कर दे". Booked in the field, the shop often is not on the books, and
   * sending someone off to Parties to add it would lose the order they were
   * halfway through writing.
   *
   * It is the real customer form, the same one Parties › Distributors uses,
   * rather than a short version of it: a firm added here has to be a proper
   * record — on a manager, under an executive, on a rate column — or the very
   * next thing it does is price an order wrongly.
   */
  const [newParty, setNewParty] = useState(null)
  const [savingParty, setSavingParty] = useState(false)

  const managerOptions = useMemo(() => users.filter((u) => u.role === 'MANAGER').map((u) => ({ value: u.id, label: u.name })), [users])
  const executiveOptions = useMemo(
    () => users.filter((u) => u.role === 'EXECUTIVE').map((u) => ({ value: u.id, label: u.name, hint: u.mobile })),
    [users],
  )

  const saveNewParty = async () => {
    const found = validateDistributorForm(newParty.form, { distributors })
    if (Object.keys(found).some((key) => found[key])) return setNewParty((d) => ({ ...d, errors: found }))

    setSavingParty(true)
    const result = await dispatch(saveDistributor({ id: null, form: newParty.form }))
    setSavingParty(false)

    if (saveDistributor.rejected.match(result)) {
      const { message, details } = result.payload
      if (details) setNewParty((d) => ({ ...d, errors: { ...d.errors, ...details } }))
      return toast({ tone: 'danger', title: 'Could not add the customer', description: message })
    }

    // Straight onto the order being written, so nobody has to find it again.
    const { distributor } = result.payload
    setNewParty(null)
    update('distributorId', distributor.id)
    // Attaching an executive changes their record too, so that list is stale.
    dispatch(fetchUsers())
    toast({ tone: 'success', title: 'Customer added', description: `${distributor.name} — now on this order.` })
  }

  const itemsById = useMemo(() => Object.fromEntries(items.map((row) => [row.id, row])), [items])
  const giftsById = useMemo(() => Object.fromEntries(gifts.map((row) => [row.id, row])), [gifts])

  /** What this order has earned, and which of it is being handed over. */
  const [offers, setOffers] = useState([])
  const [freebies, setFreebies] = useState([])
  const [schemeOff, setSchemeOff] = useState(0)
  const [chosen, setChosen] = useState([])
  const [lots, setLots] = useState({})

  useEffect(() => {
    dispatch(fetchDistributors())
    dispatch(fetchSettings())
    dispatch(fetchSchemes())
    // Managers and executives, because a new customer has to be put under one.
    dispatch(fetchUsers())
  }, [dispatch])

  /// A new order opens on the house terms; once it has its own they are left be.
  const [termsSeeded, setTermsSeeded] = useState(false)
  if (!orderId && !termsSeeded && rules.terms && !form.terms) {
    setTermsSeeded(true)
    setForm((f) => ({ ...f, terms: rules.terms }))
  }

  /**
   * The number the order will carry, offered by the server so nobody in the
   * field has to invent one. Only for a new order — an existing one has its
   * own and keeps it.
   */
  useEffect(() => {
    if (orderId) return
    let alive = true
    ordersService
      .nextOrderNo()
      .then((number) => alive && setForm((f) => (f.orderNo ? f : { ...f, orderNo: number })))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [orderId])

  useEffect(() => {
    if (!orderId) return
    let alive = true
    ordersService
      .getOrder(orderId)
      .then((order) => {
        if (!alive) return
        setSaved(order)
        setForm(orderToForm(order))
        // The decision comes back with the order, so reopening it shows the
        // schemes that were handed over rather than offering them all again.
        setChosen(order.schemeIds ?? [])
        setLots(order.schemeLots ?? {})
        setLoading(false)
      })
      .catch(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [orderId])

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }))
  }

  // What a saved order prints with: its own copy of the letterhead, falling
  // back to today's settings for anything made before documents kept one.
  const paper = letterheadFor(saved, { company: companySettings, bank, invoice: rules })

  const firm = distributors.find((row) => row.id === form.distributorId)

  /**
   * Which firm the Ship To block belongs to, read back from the address rather
   * than stored — `shipTo` is free text the office may correct.
   */
  const shipToFirmId =
    distributors.find((row) => row.id !== form.distributorId && addressOf(row).trim() === (form.shipTo ?? '').trim())?.id ?? ''

  /// Locked once the customer has agreed to it, which is the server's rule too.
  const locked = Boolean(saved && !OPEN_STATUSES.includes(saved.status))

  const isDirty = !saved || JSON.stringify(formToPayload(form)) !== JSON.stringify(formToPayload(orderToForm(saved)))
  const hasTyped = JSON.stringify(formToPayload(form)) !== JSON.stringify(formToPayload(emptyOrderForm({ orderNo: form.orderNo })))
  const worthKeeping = saved ? isDirty : hasTyped

  // A half-typed order is easy to lose to a stray reload, so the browser asks.
  useEffect(() => {
    if (!worthKeeping || locked) return
    const warn = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [worthKeeping, locked])

  /** The lines as the scheme engine reads them: what, how many, how much. */
  const forSchemes = useMemo(
    () =>
      form.lines
        .filter((line) => line.itemId && Number(line.quantity) > 0)
        .map((line) => {
          const priced = previewLine({ item: items.find((row) => row.id === line.itemId), tier: firm?.priceTier, tiers, quantity: line.quantity })
          return { itemId: line.itemId, quantity: Number(line.quantity), taxableValue: priced?.taxableValue ?? 0 }
        }),
    [form.lines, items, firm?.priceTier, tiers],
  )

  const live = useMemo(() => (offers.length ? chosen.filter((id) => offers.some((row) => row.id === id)) : chosen), [chosen, offers])

  const asking = !locked && forSchemes.length > 0
  const orderFreebies = asking ? freebies : []
  const orderSchemeOff = asking ? schemeOff : 0

  /**
   * What the order has earned, asked of the server so the answer is the one a
   * save would give — the same preview the bill uses.
   */
  useEffect(() => {
    if (!asking) return
    let alive = true
    schemesService
      .previewSchemes({ lines: forSchemes, at: form.orderDate, only: live, lots })
      .then((result) => {
        if (!alive) return
        setOffers(result?.offered ?? [])
        setFreebies(result?.freebies ?? [])
        setSchemeOff(Number(result?.discount) || 0)
      })
      .catch(() => {
        if (!alive) return
        setOffers([])
        setFreebies([])
        setSchemeOff(0)
      })
    return () => {
      alive = false
    }
  }, [asking, forSchemes, form.orderDate, live, lots])

  /** What a little more would earn, read off the same slabs the server reads. */
  const nearly = useMemo(() => {
    const spend = forSchemes.reduce((sum, line) => sum + line.taxableValue, 0)
    const qtyOf = (ids) => forSchemes.filter((line) => ids.includes(line.itemId)).reduce((sum, line) => sum + line.quantity, 0)

    return schemes
      .filter((scheme) => scheme.status === 'ACTIVE')
      .map((scheme) => {
        const reached =
          scheme.trigger === 'ITEM_QTY'
            ? qtyOf(scheme.buyItemIds ?? [])
            : scheme.scope === 'PRODUCTS'
              ? forSchemes.filter((l) => (scheme.productIds ?? []).includes(l.itemId)).reduce((s, l) => s + l.taxableValue, 0)
              : spend
        if (!reached) return null
        return nextRung(scheme, reached, { itemsById, giftsById })
      })
      .filter(Boolean)
      .slice(0, 3)
  }, [forSchemes, schemes, itemsById, giftsById])

  /** The order as it stands, priced in the browser the way the server will. */
  const totals = previewTotals(
    form.lines
      .filter((line) => line.itemId)
      .map((line) => previewLine({ item: items.find((row) => row.id === line.itemId), tier: firm?.priceTier, tiers, quantity: line.quantity })),
    orderSchemeOff,
  )

  const interState = Boolean(firm?.state && firm.state.toUpperCase() !== 'UP')
  const half = Math.round(totals.taxAmount * 50) / 100

  /**
   * The order shaped the way the printed sheet wants it.
   *
   * `invoiceNo` and `invoiceDate` are what the sheet reads, so the order's own
   * number and date are handed over under those names — the sheet is the bill's
   * sheet and knows nothing about orders, which is precisely why it can be
   * shared without either document bending to the other.
   */
  const asSheet = {
    ...form,
    invoiceNo: form.orderNo,
    invoiceDate: form.orderDate,
    priceTier: firm?.priceTier ?? '',
    interState,
    distributor: firm ?? {},
    dueDate: saved?.dueDate ?? '',
    ...totals,
    schemeFreebies: orderFreebies,
    cgst: interState ? 0 : half,
    sgst: interState ? 0 : Math.round((totals.taxAmount - half) * 100) / 100,
    igst: interState ? totals.taxAmount : 0,
    lines: form.lines
      .filter((line) => line.itemId)
      .map((line) => {
        const item = items.find((row) => row.id === line.itemId)
        const priced = previewLine({ item, tier: firm?.priceTier, tiers, quantity: line.quantity }) ?? {}
        return {
          id: line.itemId,
          itemName: item?.name ?? '',
          quantity: line.quantity,
          gstRate: priced.gst ?? 0,
          rate: priced.rate ?? 0,
          taxableValue: priced.taxableValue ?? 0,
          total: priced.total ?? 0,
          batches: [],
        }
      }),
  }

  /// A saved order, shaped for the sheet the same way.
  const savedSheet = saved ? { ...saved, invoiceNo: saved.orderNo, invoiceDate: saved.orderDate } : null

  const openTemplate = () => setTemplate({ company: { ...companySettings }, bank: { ...bank } })

  const saveTemplate = async () => {
    setSavingTemplate(true)
    const [co, bk] = await Promise.all([
      dispatch(saveSettingsGroup({ group: 'company', patch: template.company })),
      dispatch(saveSettingsGroup({ group: 'bank', patch: template.bank })),
    ])
    setSavingTemplate(false)
    if (saveSettingsGroup.rejected.match(co) || saveSettingsGroup.rejected.match(bk)) {
      return toast({ tone: 'danger', title: 'Could not save the template' })
    }
    setTemplate(null)
    toast({ tone: 'success', title: 'Template saved', description: 'Every bill and order prints with it from now on.' })
  }

  /**
   * `goBack` is false only when Confirm calls this first — it needs the saved
   * order in hand before it can confirm it.
   */
  const save = async ({ goBack = true } = {}) => {
    const found = validateOrderForm(form)
    if (Object.keys(found).length) {
      setErrors(found)
      document.getElementById(FIELD_IDS[Object.keys(found)[0]])?.focus()
      return null
    }

    setSaving(true)
    // Which schemes to hand over goes with the order, so a skip is honoured
    // rather than decided again on the server.
    const result = await dispatch(saveOrder({ id: orderId, form: { ...formToPayload(form), schemeIds: live, schemeLots: lots } }))
    setSaving(false)

    if (saveOrder.rejected.match(result)) {
      const { message, details } = result.payload
      if (details) setErrors((current) => ({ ...current, ...details }))
      toast({ tone: 'danger', title: 'Could not save', description: message })
      return null
    }

    const order = result.payload.order
    setSaved(order)

    if (goBack) {
      navigate('/admin/sales/orders', {
        state: {
          notice: { tone: 'success', message: `Order ${order.orderNo} saved — ${formatINR(order.total)}.` },
          highlightId: order.id,
        },
      })
    }
    return order
  }

  const confirm = async () => {
    setConfirming(false)
    // Save whatever is on screen first, so what is agreed is what is shown.
    const order = saved && !isDirty ? saved : await save({ goBack: false })
    if (!order) return

    setSaving(true)
    const result = await dispatch(setOrderStatus({ id: order.id, status: 'CONFIRMED' }))
    setSaving(false)

    if (setOrderStatus.rejected.match(result)) {
      return toast({ tone: 'danger', title: 'Could not confirm', description: result.payload.message })
    }
    navigate('/admin/sales/orders', {
      state: {
        notice: {
          tone: 'success',
          message: `Order ${result.payload.order.orderNo} confirmed — convert it to an invoice when the goods go out.`,
        },
        highlightId: result.payload.order.id,
      },
    })
  }

  if (loading) {
    return (
      <div className="grid min-h-60 place-items-center" role="status" aria-label="Loading order">
        <span className="size-8 animate-spin rounded-full border-3 border-mint border-t-green-deep" />
      </div>
    )
  }

  const itemCount = form.lines.filter((line) => line.itemId).length

  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-10">
      <div className="sticky top-16 z-10 -mx-4 flex flex-col gap-3 border-b border-mint-pale bg-bg/90 px-4 py-3 backdrop-blur sm:mx-0 sm:flex-row sm:items-center sm:justify-between sm:rounded-2xl sm:border sm:bg-white/90 sm:px-5">
        <div className="min-w-0">
          <Link to="/admin/sales/orders" className="inline-flex items-center gap-1 text-xs font-semibold text-green-deep hover:underline">
            <ArrowLeft className="size-3.5" /> Sales Orders
          </Link>
          <h1 className="truncate text-2xl font-extrabold sm:text-3xl">
            {orderId ? 'Edit sales order' : 'Create Sales Order'}
            {form.orderNo && <span className="ml-2 font-mono text-base font-medium text-ink-muted">{form.orderNo}</span>}
          </h1>
          <p className="text-xs text-ink-muted">
            {locked
              ? `${saved.status.charAt(0) + saved.status.slice(1).toLowerCase()}${saved.invoiceNo ? ` · billed on ${saved.invoiceNo}` : ''}`
              : 'Save records the order. Confirm is the customer agreeing to it — no stock moves either way.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="lg" onClick={() => window.print()}>
            <Printer data-icon="inline-start" /> PDF
          </Button>
          <Button type="button" variant="outline" size="lg" onClick={() => navigate('/admin/sales/orders')}>
            Cancel
          </Button>
          <Button type="button" variant="outline" size="lg" onClick={openTemplate}>
            <Pencil data-icon="inline-start" /> Edit template
          </Button>
          {saved && (
            <Button type="button" variant="outline" size="lg" onClick={() => setReviewing((on) => !on)}>
              {reviewing ? <Pencil data-icon="inline-start" /> : <Printer data-icon="inline-start" />}
              {reviewing ? 'Edit' : 'View order'}
            </Button>
          )}
          <Button type="button" variant="outline" size="lg" onClick={save} disabled={saving || locked}>
            {saving && <Loader2 className="animate-spin" data-icon="inline-start" />}
            Save
          </Button>
          <Button type="button" size="lg" onClick={() => setConfirming(true)} disabled={saving || locked}>
            <CheckCircle2 data-icon="inline-start" /> Confirm
          </Button>
        </div>
      </div>

      <SchemePanel
        offers={asking ? offers : []}
        nearly={nearly}
        chosen={live}
        disabled={locked}
        onToggle={(id) =>
          setChosen((was) => {
            if (was.includes(id)) {
              setLots(({ [id]: _gone, ...rest }) => rest)
              return was.filter((row) => row !== id)
            }
            return [...was, id]
          })
        }
        onLots={(id, n) => setLots((was) => ({ ...was, [id]: Math.max(1, n) }))}
      />

      {/**
       * Where the order was actually booked.
       *
       * This is what makes an order *secondary* sales: the executive stands in
       * a clinic or a shop and books there, and the distributor above is who
       * fulfils it and who we bill. The Executive Secondary card on the
       * dashboard reads these two fields, and the client asked for the shop or
       * doctor and their number as columns of their own.
       *
       * It sits outside the sheet and off the paper on purpose. The printed
       * order is the one the distributor gets, and who the goods were sold on
       * to is ours to know, not theirs to read.
       */}
      <div className="rounded-2xl border border-mint-pale bg-white p-4 print:hidden sm:p-5">
        {/* Sized for the screen, not the sheet: FIELD above is the 9px style
            the paper inputs use, which is unreadable in a normal card. */}
        <h2 className="mb-1 text-sm font-semibold text-black">Booked at</h2>
        <p className="mb-3 text-xs text-ink-muted">
          The shop or doctor this order was taken from. Leave it empty for an order the office typed itself.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="order-shop-name" className="block text-[11px] font-semibold tracking-wide text-ink-muted uppercase">
              Shop / Doctor
            </label>
            <input
              id="order-shop-name"
              type="text"
              value={form.shopName}
              onChange={(e) => update('shopName', e.target.value)}
              disabled={locked}
              placeholder="Dr. Sharma Clinic"
              maxLength={120}
              className={SCREEN_FIELD}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="order-shop-mobile" className="block text-[11px] font-semibold tracking-wide text-ink-muted uppercase">
              Their mobile
            </label>
            <input
              id="order-shop-mobile"
              type="tel"
              inputMode="numeric"
              value={form.shopMobile}
              onChange={(e) => update('shopMobile', e.target.value)}
              disabled={locked}
              placeholder="98765 43210"
              maxLength={20}
              className={SCREEN_FIELD}
            />
          </div>
        </div>
      </div>

      {/**
       * `bill-sheet` is the id the print stylesheet dresses for paper: it
       * hides the panel around the sheet, strips the borders off the inputs
       * and drops the buttons. An order prints on the very same sheet, so it
       * carries the same id rather than a second copy of all those rules —
       * without it, printing an order puts the whole screen on the page.
       */}
      {reviewing && savedSheet ? (
        <div id="bill-sheet" className="rounded-2xl border border-mint-pale bg-white p-4 sm:p-6">
          <InvoicePrint
            invoice={savedSheet}
            bank={paper.bank}
            company={paper.company}
            taxRate={paper.taxRate}
            heading="SALES ORDER"
            numberLabel="ORDER NO."
            // No e-way bill and no batch columns: an order names neither.
            show={{ vehicleNo: paper.show.vehicleNo, ewayBillNo: false, batches: false }}
          />
        </div>
      ) : (
        <div id="bill-sheet" className="rounded-2xl border border-mint-pale bg-white p-4 sm:p-6">
          <InvoicePrint
            invoice={asSheet}
            bank={bank}
            company={companySettings}
            taxRate={rules.defaultGstRate}
            heading="SALES ORDER"
            numberLabel="ORDER NO."
            // No e-way bill on an order: nothing is travelling yet. And no
            // batch columns — the bill made from it is where batches are picked.
            show={{ vehicleNo: rules.showVehicleNo !== false, ewayBillNo: false, batches: false }}
            slots={{
              invoiceNo: (
                <input
                  id="order-no"
                  aria-label="Order number"
                  placeholder="SO/26-27/0001"
                  value={form.orderNo}
                  onChange={(e) => update('orderNo', e.target.value)}
                  disabled={locked || Boolean(saved)}
                  className={cn(FIELD, errors.orderNo && 'border-destructive')}
                />
              ),
              invoiceDate: (
                <input
                  id="order-date"
                  type="date"
                  aria-label="Order date"
                  value={form.orderDate}
                  onChange={(e) => update('orderDate', e.target.value)}
                  disabled={locked || Boolean(saved)}
                  className={FIELD}
                />
              ),
              extraMeta: (
                <div className="space-y-[1px] print:hidden">
                  {rules.showCreditPeriod !== false && (
                    <div className="grid grid-cols-[7.5rem_0.5rem_1fr] gap-x-1">
                      <span>CREDIT PERIOD</span>
                      <span>:</span>
                      <span className="flex items-center gap-1">
                        <input
                          id="order-credit-days"
                          aria-label="Credit period in days"
                          inputMode="numeric"
                          value={form.creditDays}
                          onChange={(e) => update('creditDays', e.target.value.replace(/\D/g, ''))}
                          disabled={locked}
                          className={cn(FIELD, 'w-14')}
                        />
                        days
                      </span>
                    </div>
                  )}
                  <div className="grid grid-cols-[7.5rem_0.5rem_1fr] gap-x-1">
                    <span>TOTAL NAG</span>
                    <span>:</span>
                    <input
                      id="order-packages"
                      aria-label="Number of packages"
                      inputMode="numeric"
                      placeholder="7"
                      value={form.packages}
                      onChange={(e) => update('packages', e.target.value.replace(/\D/g, ''))}
                      disabled={locked}
                      className={cn(FIELD, 'w-14')}
                    />
                  </div>
                  <div className="grid grid-cols-[7.5rem_0.5rem_1fr] gap-x-1">
                    <span>COMMENT</span>
                    <span>:</span>
                    <input
                      id="order-note"
                      aria-label="Comment"
                      placeholder="Anything to note"
                      value={form.note}
                      onChange={(e) => update('note', e.target.value)}
                      disabled={locked}
                      className={FIELD}
                    />
                  </div>
                  {/* Who booked it, once the server has said. */}
                  {saved?.takenByName && <p className="pt-0.5 text-[8px] text-ink-muted">Booked by {saved.takenByName}</p>}
                </div>
              ),
              billTo: (
                <div className="space-y-1.5">
                  {firm && <p className="hidden font-bold print:block">M/S {firm.name}</p>}
                  <SearchSelect
                    id="order-distributor"
                    aria-label="Customer"
                    placeholder="Enter customer name"
                    limit={10}
                    options={distributors.map((row) => ({ value: row.id, label: row.name, hint: row.city || row.mobile }))}
                    value={form.distributorId}
                    onChange={(v) => update('distributorId', v)}
                    invalid={Boolean(errors.distributorId)}
                    disabled={locked || Boolean(saved)}
                  />
                  {errors.distributorId && <p className="text-xs font-medium text-destructive">{errors.distributorId}</p>}
                  {/* The shop may not be on the books yet, and walking off to
                      Parties to add it would lose the order being written. */}
                  {!locked && !saved && (
                    <button
                      type="button"
                      id="order-new-customer"
                      onClick={() => setNewParty({ errors: {}, form: emptyDistributorForm() })}
                      className="inline-flex items-center gap-1 text-[9px] font-semibold text-green-deep underline print:hidden"
                    >
                      <UserPlus className="size-3" /> New customer
                    </button>
                  )}
                  {firm && (
                    <div className="text-[11px] leading-snug">
                      {firm.address && <p className="whitespace-pre-line">{firm.address}</p>}
                      <p>{[firm.state, firm.pincode].filter(Boolean).join(' · ')}</p>
                      {firm.mobile && <p>Ph {firm.mobile}</p>}
                      <p className="font-semibold">{firm.gstin ? `GSTIN: ${firm.gstin}` : 'No GSTIN (unregistered)'}</p>
                    </div>
                  )}
                </div>
              ),
              shipTo: (
                <div className="space-y-1.5">
                  {!locked && (
                    <SearchSelect
                      id="order-ship-to-firm"
                      aria-label="Ship to customer"
                      placeholder={form.shipTo ? 'Other address' : 'Same as billing'}
                      limit={10}
                      clearable
                      options={distributors
                        .filter((row) => row.id !== form.distributorId)
                        .map((row) => ({ value: row.id, label: row.name, hint: row.city || row.mobile }))}
                      value={shipToFirmId}
                      onChange={(id) => {
                        const other = distributors.find((row) => row.id === id)
                        update('shipTo', other ? addressOf(other) : '')
                      }}
                    />
                  )}
                  {form.shipTo ? (
                    <>
                      <textarea
                        id="order-ship-to"
                        aria-label="Ship to address"
                        rows={4}
                        value={form.shipTo}
                        onChange={(e) => update('shipTo', e.target.value)}
                        disabled={locked}
                        placeholder={'M/S ...\nStreet, area\nCity, State, PIN'}
                        className={cn(FIELD, 'resize-y')}
                      />
                      <button
                        type="button"
                        onClick={() => update('shipTo', '')}
                        disabled={locked}
                        className="text-[9px] font-semibold text-green-deep underline print:hidden"
                      >
                        Same as billing
                      </button>
                    </>
                  ) : (
                    <>
                      {firm ? (
                        <div className="text-[9px] leading-snug">
                          <p className="font-bold">M/S {firm.name}</p>
                          {firm.address && <p className="whitespace-pre-line">{firm.address}</p>}
                          <p>{[firm.state, firm.pincode].filter(Boolean).join(', ')}</p>
                        </div>
                      ) : (
                        <p className="text-[9px] text-ink-muted">Same as billing</p>
                      )}
                      <button
                        type="button"
                        onClick={() => update('shipTo', firm ? addressOf(firm) : 'M/S ')}
                        disabled={locked}
                        className="inline-flex items-center gap-1 text-[9px] font-semibold text-green-deep underline print:hidden"
                      >
                        + New address
                      </button>
                    </>
                  )}
                </div>
              ),
              transport: (
                <input
                  id="order-transport"
                  aria-label="Transport"
                  placeholder="FOR TPT BY AUTO"
                  value={form.transport}
                  onChange={(e) => update('transport', e.target.value.toUpperCase())}
                  disabled={locked}
                  className={FIELD}
                />
              ),
              vehicleNo: (
                <input
                  id="order-vehicle"
                  aria-label="Vehicle number"
                  placeholder="UP-14-RT-5632"
                  value={form.vehicleNo}
                  onChange={(e) => update('vehicleNo', e.target.value.toUpperCase())}
                  disabled={locked}
                  className={FIELD}
                />
              ),
              station: (
                <input
                  id="order-station"
                  aria-label="Station"
                  placeholder="RAMPUR"
                  value={form.station}
                  onChange={(e) => update('station', e.target.value.toUpperCase())}
                  disabled={locked}
                  className={FIELD}
                />
              ),
              lines: (
                <InvoiceLines
                  freebies={freebies}
                  form={form}
                  errors={errors}
                  items={items}
                  onChange={update}
                  tier={firm?.priceTier}
                  tiers={tiers}
                  disabled={locked}
                  interState={interState}
                  taxRate={rules.defaultGstRate}
                  // An order picks no batches — the bill made from it does.
                  batches={false}
                />
              ),
            }}
          />
          {saved && isDirty && <p className="pt-2 text-right text-xs text-warning-ink">Not saved yet.</p>}
        </div>
      )}

      <FormDrawer
        open={Boolean(template)}
        onOpenChange={(open) => !open && setTemplate(null)}
        title="Edit bill template"
        description="What every printed bill and order says. The layout stays the same; these are the words on it."
        onSubmit={saveTemplate}
        saving={savingTemplate}
        saveLabel="Save template"
      >
        {template && (
          <BillTemplate
            company={template.company}
            bank={template.bank}
            onChange={(key, value) => setTemplate((t) => ({ ...t, company: { ...t.company, [key]: value } }))}
            onChangeBank={(key, value) => setTemplate((t) => ({ ...t, bank: { ...t.bank, [key]: value } }))}
          />
        )}
      </FormDrawer>

      {/* The real customer form, so a firm added here is a proper record. */}
      <FormDrawer
        open={Boolean(newParty)}
        onOpenChange={(open) => !open && setNewParty(null)}
        title="New customer"
        description="Added here and put straight onto this order."
        onSubmit={saveNewParty}
        saving={savingParty}
        saveLabel="Add customer"
      >
        {newParty && (
          <DistributorForm
            form={newParty.form}
            errors={newParty.errors}
            onChange={(field, value) =>
              setNewParty((d) => ({ ...d, form: { ...d.form, [field]: value }, errors: { ...d.errors, [field]: undefined } }))
            }
            managers={managerOptions}
            executives={executiveOptions}
            regions={regions}
            cities={cities}
            areas={areas}
          />
        )}
      </FormDrawer>

      <Modal
        open={confirming}
        onOpenChange={setConfirming}
        title="Confirm this order?"
        description="The customer has agreed to it, so it stops being editable — put it back to pending if it has to change. No stock moves: that happens when the invoice is issued."
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button onClick={confirm}>Yes, confirm it</Button>
          </>
        }
      >
        <p className="text-sm text-ink-muted">
          {itemCount} item{itemCount === 1 ? '' : 's'} for {firm?.name ?? 'the customer'}
          {form.orderNo ? ` on ${form.orderNo}` : ''} — {formatINR(totals.total)}.
        </p>
      </Modal>
    </div>
  )
}
