import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams, useSearchParams } from 'react-router-dom'
import * as invoicesService from '@/services/invoicesService'
import { fetchSettings, selectBank } from '@/store/settingsSlice'
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

  // Print once the bill is on the page, not before — an empty sheet otherwise.
  useEffect(() => {
    if (!invoice || params.get('print') !== '1') return
    const id = setTimeout(() => window.print(), 300)
    return () => clearTimeout(id)
  }, [invoice, params])

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
      <InvoicePrint invoice={invoice} bank={bank} />
    </div>
  )
}
