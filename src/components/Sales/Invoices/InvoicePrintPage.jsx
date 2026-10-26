import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams, useSearchParams } from 'react-router-dom'
import * as invoicesService from '@/services/invoicesService'
import { fetchSettings, selectBank, selectCompanySettings, selectInvoiceSettings } from '@/store/settingsSlice'
import { COPY_LABEL } from './components/InvoicePrint/billFormat'
import { InvoicePrint } from './components/InvoicePrint'

/**
 * One bill on its own page, outside the panel's chrome, so the browser prints
 * the document and nothing else. "थ्री डॉट पर क्लिक करो, पीडीएफ डाउनलोड हो
 * जाएगा" — the browser's own Save as PDF is the download.
 *
 * `?print=1` opens the print dialog as soon as it has the bill.
 */
export default function InvoicePrintPage() {
  const { invoiceId } = useParams()
  const [params] = useSearchParams()
  const dispatch = useDispatch()
  const bank = useSelector(selectBank)
  const company = useSelector(selectCompanySettings)
  const rules = useSelector(selectInvoiceSettings)

  const [invoice, setInvoice] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    dispatch(fetchSettings())
  }, [dispatch])

  useEffect(() => {
    let alive = true
    invoicesService
      .getInvoice(invoiceId)
      .then((found) => alive && setInvoice(found))
      .catch(() => alive && setError('That invoice could not be opened.'))
    return () => {
      alive = false
    }
  }, [invoiceId])

  /**
   * The browser names a saved PDF after the page title, so the title is the
   * distributor and the bill's own date — "डिस्ट्रीब्यूटर का नाम… और इनवाइस की
   * जो डेट है वो" — rather than "Nirog Pharma" every time.
   */
  useEffect(() => {
    if (!invoice) return
    const had = document.title
    const when = (invoice.invoiceDate || '').split('-').reverse().join('-')
    document.title = [invoice.distributorName, when].filter(Boolean).join(' ') || had
    return () => {
      document.title = had
    }
  }, [invoice])

  // Print once the bill is on the page, not before — an empty sheet otherwise.
  useEffect(() => {
    if (!invoice || params.get('print') !== '1') return
    const id = setTimeout(() => window.print(), 300)
    return () => clearTimeout(id)
  }, [invoice, params])

  // Three copies on three pages, unless one of them was asked for by name.
  const asked = params.get('copy')
  const copies =
    asked && asked !== 'all' && COPY_LABEL[asked] ? [COPY_LABEL[asked]] : Object.values(COPY_LABEL)

  if (error) return <p className="p-8 text-center text-sm text-destructive">{error}</p>
  if (!invoice) {
    return (
      <div className="grid min-h-screen place-items-center" role="status" aria-label="Loading invoice">
        <span className="size-8 animate-spin rounded-full border-3 border-mint border-t-green-deep" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg py-6 print:bg-white print:py-0">
      {copies.map((copy, index) => (
        <div key={copy} className={index > 0 ? 'mt-8 break-before-page print:mt-0' : undefined}>
          <InvoicePrint
            invoice={invoice}
            bank={bank}
            company={company}
            taxRate={rules.defaultGstRate}
            copy={copy}
            show={{
              vehicleNo: rules.showVehicleNo !== false,
              ewayBillNo: rules.showEwayBill !== false,
              creditPeriod: rules.showCreditPeriod !== false,
            }}
          />
        </div>
      ))}
    </div>
  )
}
