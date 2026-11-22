import { useEffect, useMemo, useState } from 'react'
import { FileSpreadsheet, Loader2, Plus, ShoppingCart } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { useLocation, useNavigate } from 'react-router-dom'
import { Modal } from '@/components/common/Modal'
import { useToast } from '@/components/common/Toast'
import { TextField } from '@/components/form/TextField'
import { DataTable } from '@/components/data/DataTable'
import { EmptyState } from '@/components/data/EmptyState'
import { ExportMenu } from '@/components/data/ExportMenu'
import { FiltersPopover } from '@/components/data/FiltersPopover'
import { Notice } from '@/components/data/Notice'
import { PageHeader } from '@/components/data/PageHeader'
import { Pagination } from '@/components/data/Pagination'
import { SearchInput } from '@/components/data/SearchInput'
import { DateRangeFilter } from '@/components/form/DateRangeFilter'
import { SearchSelect } from '@/components/form/SearchSelect'
import { SelectField } from '@/components/form/SelectField'
import { Button } from '@/components/ui/button'
import { presetRange } from '@/lib/dateRange'
import { formatINR } from '@/lib/format'
import { buildWorkbook, downloadWorkbook } from '@/lib/xlsx'
import { selectCities, selectRoutes } from '@/store/geographySlice'
import { fetchDistributors, selectDistributors } from '@/store/distributorsSlice'
import * as invoicesService from '@/services/invoicesService'
import { convertOrder, fetchOrders, removeOrder, selectOrders, selectOrdersError, selectOrdersStatus, setOrderStatus } from '@/store/ordersSlice'
import { fetchUsers, selectUsers } from '@/store/usersSlice'
import { buildOrderColumns, DEFAULT_ORDER_VISIBILITY, ORDER_COLUMN_OPTIONS } from './components/OrdersTable'
import { ORDER_STATUSES, STATUS_LABEL } from './orderModel'

const PAGE_SIZE = 20
const EMPTY_FILTERS = { routeId: '', takenById: '' }
const getRowId = (order) => order.id

/**
 * Sales › Sales Orders — the same list the sales invoices use, on real orders.
 *
 * An order is a promise, so this screen shows no Due column: nothing is owed
 * until the bill is made. What it shows instead is **Booked By**, because an
 * order is taken wherever the customer is — by the office or by an executive
 * out on his beat — and knowing whose it was is the point.
 */
export default function SalesOrders() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()

  const orders = useSelector(selectOrders)
  const loadStatus = useSelector(selectOrdersStatus)
  const loadError = useSelector(selectOrdersError)
  const distributors = useSelector(selectDistributors)
  const users = useSelector(selectUsers)
  const routes = useSelector(selectRoutes)
  const cities = useSelector(selectCities)

  const [range, setRange] = useState(() => ({ preset: 'thisMonth', ...presetRange('thisMonth') }))
  const [search, setSearch] = useState('')
  const [distributorId, setDistributorId] = useState('')
  const [status, setStatus] = useState('')
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE })
  const [columnVisibility, setColumnVisibility] = useState(DEFAULT_ORDER_VISIBILITY)
  const [notice, setNotice] = useState(location.state?.notice ?? null)
  const [highlightId] = useState(location.state?.highlightId ?? null)
  /**
   * Turning an order into a bill asks for the bill's number first, because the
   * client writes their own — "NP/26-27/755". A suggestion is offered and can
   * be typed over.
   */
  const [billing, setBilling] = useState(null) // { order, invoiceNo, error }
  const [converting, setConverting] = useState(false)

  useEffect(() => {
    dispatch(fetchOrders({}))
    dispatch(fetchDistributors())
    dispatch(fetchUsers())
  }, [dispatch])

  useEffect(() => {
    if (location.state) navigate(location.pathname, { replace: true, state: null })
  }, [location.pathname, location.state, navigate])

  const routeOptions = useMemo(() => {
    const cityName = Object.fromEntries(cities.map((c) => [c.id, c.name]))
    return routes.map((r) => ({ value: r.id, label: r.name, hint: cityName[r.cityId] }))
  }, [routes, cities])

  /// Who an order can have been booked by: the office and the field staff.
  const staffOptions = useMemo(
    () =>
      users
        .filter((row) => row.role !== 'DISTRIBUTOR')
        .map((row) => ({ value: row.id, label: row.name, hint: row.role.toLowerCase() })),
    [users],
  )

  const distributorsById = useMemo(() => Object.fromEntries(distributors.map((row) => [row.id, row])), [distributors])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return orders.filter((order) => {
      if (order.orderDate < range.start || order.orderDate > range.end) return false
      if (distributorId && order.distributorId !== distributorId) return false
      if (status && order.status !== status) return false
      if (filters.takenById && order.takenById !== filters.takenById) return false
      if (filters.routeId && distributorsById[order.distributorId]?.areaId !== filters.routeId) return false
      if (!q) return true
      return (
        order.orderNo.toLowerCase().includes(q) ||
        order.distributorName.toLowerCase().includes(q) ||
        order.takenByName?.toLowerCase().includes(q) ||
        order.note?.toLowerCase().includes(q) ||
        order.lines.some((line) => line.itemName.toLowerCase().includes(q))
      )
    })
  }, [orders, range, distributorId, status, filters, search, distributorsById])

  // A cancelled order is not business anyone is expecting, so it stays out.
  const grandTotal = filtered.filter((order) => order.status !== 'CANCELLED').reduce((sum, order) => sum + order.total, 0)
  // What is promised but not yet billed — the number the office actually works
  // from, because that is the work still to do.
  const openValue = filtered
    .filter((order) => !['CANCELLED', 'INVOICED', 'DISPATCHED', 'DELIVERED'].includes(order.status))
    .reduce((sum, order) => sum + order.total, 0)

  const pageCount = Math.max(1, Math.ceil(filtered.length / pagination.pageSize))
  const page = pagination.pageIndex < pageCount ? pagination : { ...pagination, pageIndex: pageCount - 1 }
  const resetPage = () => setPagination((p) => ({ ...p, pageIndex: 0 }))
  const hasFilters = Boolean(search || distributorId || status || Object.values(filters).some(Boolean))

  const move = async (order, next) => {
    const result = await dispatch(setOrderStatus({ id: order.id, status: next }))
    if (setOrderStatus.rejected.match(result)) {
      return toast({ tone: 'danger', title: 'Could not change the status', description: result.payload.message })
    }
    setNotice({
      tone: next === 'CANCELLED' ? 'warning' : 'success',
      message: `${order.orderNo} ${next === 'CANCELLED' ? 'cancelled' : `marked ${STATUS_LABEL[next].toLowerCase()}`}.`,
    })
  }

  const destroy = async (order) => {
    const result = await dispatch(removeOrder({ id: order.id }))
    if (removeOrder.rejected.match(result)) {
      return toast({ tone: 'danger', title: 'Could not delete', description: result.payload.message })
    }
    setNotice({ tone: 'success', message: `${order.orderNo} deleted.` })
  }

  const openBilling = async (order) => {
    setBilling({ order, invoiceNo: '', error: null })
    // Only a suggestion — if the server cannot offer one, the admin types it.
    const suggested = await invoicesService.nextInvoiceNo().catch(() => '')
    setBilling((b) => (b && b.order.id === order.id && !b.invoiceNo ? { ...b, invoiceNo: suggested } : b))
  }

  const convert = async () => {
    const invoiceNo = billing.invoiceNo.trim()
    if (!invoiceNo) return setBilling((b) => ({ ...b, error: 'Enter the invoice number.' }))

    setConverting(true)
    const result = await dispatch(convertOrder({ id: billing.order.id, body: { invoiceNo } }))
    setConverting(false)

    if (convertOrder.rejected.match(result)) {
      const { message, details } = result.payload
      if (details?.invoiceNo) return setBilling((b) => ({ ...b, error: details.invoiceNo }))
      setBilling(null)
      return toast({ tone: 'danger', title: 'Could not make the bill', description: message })
    }

    const { invoice } = result.payload
    setBilling(null)
    /**
     * A toast rather than a notice on the page: the invoice screen is a bill
     * sheet, not a list, and has nowhere to put one — so a notice handed to it
     * would simply never be read.
     */
    toast({
      tone: 'success',
      title: `${billing.order.orderNo} is now ${invoice.invoiceNo}`,
      description: 'Pick the batches, then issue it — issuing is what moves the stock.',
    })
    // Straight onto the bill, because the batches still have to be picked on
    // it and nothing leaves the factory until it is issued.
    navigate(`/admin/sales/invoices/${invoice.id}/edit`)
  }

  const columns = useMemo(
    () =>
      buildOrderColumns({
        onEdit: (order) => navigate(`/admin/sales/orders/${order.id}/edit`),
        onSetStatus: move,
        onDelete: destroy,
        onConvert: openBilling,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [navigate],
  )

  const exportExcel = async () => {
    const workbook = await buildWorkbook({
      sheetName: 'Sales Orders',
      columns: [
        { key: 'date', header: 'Date', width: 12 },
        { key: 'number', header: 'Order No', width: 18, required: true },
        { key: 'party', header: 'Party Name', width: 30, required: true },
        { key: 'gstin', header: 'GSTIN', width: 18 },
        { key: 'takenBy', header: 'Booked By', width: 20 },
        { key: 'items', header: 'Items', width: 8 },
        { key: 'taxable', header: 'Taxable', width: 13, numFmt: '0.00' },
        { key: 'tax', header: 'GST', width: 13, numFmt: '0.00' },
        { key: 'total', header: 'Amount', width: 13, numFmt: '0.00' },
        { key: 'invoice', header: 'Invoice No', width: 18 },
        { key: 'status', header: 'Status', width: 12 },
        { key: 'comment', header: 'Comment', width: 30 },
      ],
      rows: filtered.map((order) => ({
        date: order.orderDate.split('-').reverse().join('-'),
        number: order.orderNo,
        party: order.distributorName,
        gstin: order.distributorGstin,
        takenBy: order.takenByName,
        items: order.lines.length,
        taxable: order.taxableValue,
        tax: order.taxAmount,
        total: order.total,
        invoice: order.invoiceNo,
        status: STATUS_LABEL[order.status],
        comment: order.note,
      })),
    })
    await downloadWorkbook(workbook, `sales-orders-${range.start}-to-${range.end}.xlsx`)
    setNotice({ tone: 'success', message: `Exported ${filtered.length} order${filtered.length === 1 ? '' : 's'}.` })
  }

  /** One row per item on each order — what was actually asked for. */
  const exportOrderWise = async () => {
    const workbook = await buildWorkbook({
      sheetName: 'Order-wise',
      columns: [
        { key: 'date', header: 'Date', width: 12 },
        { key: 'number', header: 'Order No', width: 18, required: true },
        { key: 'party', header: 'Party Name', width: 30, required: true },
        { key: 'takenBy', header: 'Booked By', width: 20 },
        { key: 'item', header: 'Item', width: 30 },
        { key: 'quantity', header: 'Qty', width: 9, numFmt: '0.00' },
        { key: 'rate', header: 'Rate', width: 12, numFmt: '0.00' },
        { key: 'gstRate', header: 'GST %', width: 8, numFmt: '0.00' },
        { key: 'taxable', header: 'Taxable', width: 13, numFmt: '0.00' },
        { key: 'tax', header: 'GST', width: 13, numFmt: '0.00' },
        { key: 'total', header: 'Amount', width: 13, numFmt: '0.00' },
        { key: 'free', header: 'Scheme', width: 22 },
        { key: 'status', header: 'Status', width: 12 },
      ],
      rows: filtered.flatMap((order) =>
        (order.lines ?? []).map((line) => ({
          date: order.orderDate.split('-').reverse().join('-'),
          number: order.orderNo,
          party: order.distributorName,
          takenBy: order.takenByName,
          item: line.itemName,
          quantity: Number(line.quantity),
          rate: Number(line.rate),
          gstRate: Number(line.gstRate),
          taxable: Number(line.taxableValue),
          tax: Number(line.taxAmount),
          total: Number(line.total),
          free: line.freeLabel ?? '',
          status: STATUS_LABEL[order.status],
        })),
      ),
    })
    const rows = filtered.reduce((sum, order) => sum + (order.lines?.length ?? 0), 0)
    await downloadWorkbook(workbook, `sales-order-wise-${range.start}-to-${range.end}.xlsx`)
    setNotice({
      tone: 'success',
      message: `Exported ${rows} line${rows === 1 ? '' : 's'} across ${filtered.length} order${filtered.length === 1 ? '' : 's'}.`,
    })
  }

  const empty = (
    <EmptyState
      icon={ShoppingCart}
      title={hasFilters ? 'No sales orders match these filters' : 'No sales orders in this period'}
      description={
        hasFilters
          ? 'Try a different search, or clear the filters.'
          : 'Orders booked by your field staff or the office land here — confirm them, then convert to an invoice.'
      }
    >
      {hasFilters ? (
        <Button
          variant="outline"
          size="lg"
          onClick={() => {
            setSearch('')
            setDistributorId('')
            setStatus('')
            setFilters(EMPTY_FILTERS)
            resetPage()
          }}
        >
          Clear filters
        </Button>
      ) : (
        <Button size="lg" onClick={() => navigate('/admin/sales/orders/new')}>
          <Plus data-icon="inline-start" /> Create sales order
        </Button>
      )}
    </EmptyState>
  )

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader title="Sales Orders" subtitle={`${filtered.length} sales order${filtered.length === 1 ? '' : 's'} in this view`}>
        {/* What is still to be billed, which is the work outstanding. */}
        <span id="orders-open" className="inline-flex h-11 items-center rounded-lg bg-mint-pale px-3.5 text-sm font-semibold text-forest">
          Not yet billed: <span className="ml-1.5 font-mono">{formatINR(openValue)}</span>
        </span>
        <span className="inline-flex h-11 items-center rounded-lg bg-mint-pale px-3.5 text-sm font-semibold text-forest">
          Total: <span className="ml-1.5 font-mono">{formatINR(grandTotal)}</span>
        </span>
        <ExportMenu
          disabled={!filtered.length}
          options={[
            { label: 'Excel', hint: 'Styled .xlsx of the filtered list', icon: FileSpreadsheet, onSelect: exportExcel },
            { label: 'Order-wise', hint: 'One row per item on each order', icon: FileSpreadsheet, onSelect: exportOrderWise },
          ]}
        />
        <Button size="lg" className="h-11" onClick={() => navigate('/admin/sales/orders/new')}>
          <Plus data-icon="inline-start" /> Create sales order
        </Button>
      </PageHeader>

      {loadStatus === 'failed' && (
        <Notice tone="danger">
          {loadError?.message ?? 'Could not load the orders.'}
          <button type="button" onClick={() => dispatch(fetchOrders({}))} className="ml-2 font-semibold underline underline-offset-4">
            Try again
          </button>
        </Notice>
      )}

      {notice && (
        <Notice tone={notice.tone} onDismiss={() => setNotice(null)}>
          {notice.message}
        </Notice>
      )}

      <section className="overflow-hidden rounded-2xl border border-mint-pale bg-white">
        <div className="space-y-3 border-b border-mint-pale p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <SearchInput
              value={search}
              onChange={(v) => {
                setSearch(v)
                resetPage()
              }}
              placeholder="Search number, party, item, who booked it"
              className="sm:w-80"
            />
            <Pagination
              pageIndex={page.pageIndex}
              pageSize={page.pageSize}
              total={filtered.length}
              onPageChange={(pageIndex) => setPagination((p) => ({ ...p, pageIndex }))}
              className="justify-between sm:ml-auto sm:justify-end"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]">
            <DateRangeFilter
              value={range}
              onChange={(r) => {
                setRange(r)
                resetPage()
              }}
            />
            <SearchSelect
              aria-label="Filter by customer"
              placeholder="Select customer"
              clearable
              limit={10}
              options={distributors.map((row) => ({ value: row.id, label: row.name, hint: row.city || row.mobile }))}
              value={distributorId}
              onChange={(v) => {
                setDistributorId(v)
                resetPage()
              }}
            />
            <SearchSelect
              aria-label="Filter by status"
              placeholder="Select status"
              clearable
              searchable={false}
              options={ORDER_STATUSES.map(({ value, label }) => ({ value, label }))}
              value={status}
              onChange={(v) => {
                setStatus(v)
                resetPage()
              }}
            />
            <FiltersPopover
              filters={filters}
              onApply={(f) => {
                setFilters(f)
                resetPage()
              }}
              columns={ORDER_COLUMN_OPTIONS}
              visibility={columnVisibility}
              onVisibilityChange={setColumnVisibility}
              renderFilters={(draft, setDraft) => (
                <>
                  <SelectField
                    id="flt-route"
                    label="Route"
                    placeholder="Select route"
                    clearable
                    options={routeOptions}
                    value={draft.routeId}
                    onChange={(v) => setDraft('routeId', v)}
                  />
                  {/* "किसने लिया" — whose order it was. */}
                  <SelectField
                    id="flt-taken-by"
                    label="Booked by"
                    placeholder="Anyone"
                    clearable
                    options={staffOptions}
                    value={draft.takenById}
                    onChange={(v) => setDraft('takenById', v)}
                  />
                </>
              )}
            />
          </div>
        </div>

        {loadStatus === 'loading' && !orders.length ? (
          <div className="grid min-h-60 place-items-center" role="status" aria-label="Loading orders">
            <span className="size-8 animate-spin rounded-full border-3 border-mint border-t-green-deep" />
          </div>
        ) : (
          <DataTable
            data={filtered}
            columns={columns}
            getRowId={getRowId}
            pagination={page}
            onPaginationChange={setPagination}
            columnVisibility={columnVisibility}
            onColumnVisibilityChange={setColumnVisibility}
            onRowClick={(order) => navigate(`/admin/sales/orders/${order.id}/edit`)}
            highlightRowId={highlightId}
            empty={empty}
          />
        )}
      </section>

      {/* A bill needs its number, and the client writes their own. */}
      <Modal
        open={Boolean(billing)}
        onOpenChange={(open) => !open && setBilling(null)}
        title="Make the bill for this order"
        description="The bill is created as a draft. Pick its batches on the invoice, then issue it — issuing is what takes the stock out of the factory."
        footer={
          <>
            <Button variant="outline" onClick={() => setBilling(null)} disabled={converting}>
              Cancel
            </Button>
            <Button onClick={convert} disabled={converting}>
              {converting && <Loader2 className="animate-spin" data-icon="inline-start" />}
              Make the bill
            </Button>
          </>
        }
      >
        {billing && (
          <div className="space-y-3">
            <p className="text-sm text-ink-muted">
              {billing.order.orderNo} for <span className="font-semibold text-black">{billing.order.distributorName}</span> —{' '}
              {billing.order.lines.length} item{billing.order.lines.length === 1 ? '' : 's'}, {formatINR(billing.order.total)}.
            </p>
            <TextField
              id="bill-no"
              label="Invoice number"
              required
              size="md"
              placeholder="NP/26-27/756"
              maxLength={40}
              value={billing.invoiceNo}
              onChange={(e) => setBilling((b) => ({ ...b, invoiceNo: e.target.value, error: null }))}
              error={billing.error}
            />
            <p className="text-xs text-ink-muted">
              The prices, the schemes and the tax come across exactly as the customer agreed them — nothing is worked out again.
            </p>
          </div>
        )}
      </Modal>
    </div>
  )
}
