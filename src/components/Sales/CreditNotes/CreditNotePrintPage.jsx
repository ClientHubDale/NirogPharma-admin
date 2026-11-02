import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams, useSearchParams } from 'react-router-dom'
import * as creditNotesService from '@/services/creditNotesService'
import { fetchSettings, selectBank, selectCompanySettings, selectInvoiceSettings } from '@/store/settingsSlice'
import { COPY_LABEL } from '@/components/Sales/Invoices/components/InvoicePrint/billFormat'
import { letterheadFor } from '@/lib/letterhead'
import { CreditNotePrint } from './components/CreditNotePrint'

/**
 * One credit note on its own page, outside the panel's chrome, so the browser
 * prints the document and nothing else — the same arrangement as the bill.
 *
 * `?print=1` opens the print dialog as soon as it has the note.
 */
export default function CreditNotePrintPage() {
  const { noteId } = useParams()
  const [params] = useSearchParams()
  const dispatch = useDispatch()
  const bank = useSelector(selectBank)
  const company = useSelector(selectCompanySettings)
  const rules = useSelector(selectInvoiceSettings)

  const [note, setNote] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    dispatch(fetchSettings())
  }, [dispatch])

  useEffect(() => {
    let alive = true
    creditNotesService
      .getCreditNote(noteId)
      .then((found) => alive && setNote(found))
      .catch(() => alive && setError('That credit note could not be opened.'))
    return () => {
      alive = false
    }
  }, [noteId])

  // A saved PDF is named after the distributor and the note's own date.
  useEffect(() => {
    if (!note) return
    const had = document.title
    const when = (note.at || '').split('-').reverse().join('-')
    document.title = [note.distributorName, when].filter(Boolean).join(' ') || had
    return () => {
      document.title = had
    }
  }, [note])

  // Print once the note is on the page, not before — an empty sheet otherwise.
  useEffect(() => {
    if (!note || params.get('print') !== '1') return
    const id = setTimeout(() => window.print(), 300)
    return () => clearTimeout(id)
  }, [note, params])

  // Three copies on three pages, unless one of them was asked for by name.
  const asked = params.get('copy')
  const copies = asked && asked !== 'all' && COPY_LABEL[asked] ? [COPY_LABEL[asked]] : Object.values(COPY_LABEL)

  if (error) return <p className="p-8 text-center text-sm text-destructive">{error}</p>
  if (!note) {
    return (
      <div className="grid min-h-screen place-items-center" role="status" aria-label="Loading credit note">
        <span className="size-8 animate-spin rounded-full border-3 border-mint border-t-green-deep" />
      </div>
    )
  }

  // The note prints what it was written with, so a new logo or a changed bank
  // account leaves notes already made alone.
  const paper = letterheadFor(note, { company, bank, invoice: rules })

  return (
    <div className="min-h-screen bg-bg py-6 print:bg-white print:py-0">
      {copies.map((copy, index) => (
        <div key={copy} className={index > 0 ? 'mt-8 break-before-page print:mt-0' : undefined}>
          <CreditNotePrint note={note} bank={paper.bank} company={paper.company} taxRate={paper.taxRate} copy={copy} />
        </div>
      ))}
    </div>
  )
}
