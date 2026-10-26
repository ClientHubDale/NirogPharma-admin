import { useRef, useState } from 'react'
import { Banknote, FileText, ImageIcon, Loader2, QrCode } from 'lucide-react'
import { TextAreaField } from '@/components/form/TextAreaField'
import { TextField } from '@/components/form/TextField'
import api from '@/services/api'

function Card({ icon: Icon, title, hint, children }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-mint-pale bg-white">
      <header className="flex items-start gap-3 border-b border-mint-pale px-5 py-4">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-mint-pale">
          <Icon className="size-4 text-green-deep" />
        </span>
        <div>
          <h3 className="text-base font-bold text-black">{title}</h3>
          {hint && <p className="text-sm text-ink-muted">{hint}</p>}
        </div>
      </header>
      <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">{children}</div>
    </section>
  )
}

/**
 * What the server will take. Stated here so the admin reads it before picking
 * rather than after being refused — and checked here so an SVG or an oversized
 * scan is turned away without a round trip.
 */
const ACCEPTS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_MB = 5
const FORMATS = 'JPG, PNG, WEBP or GIF · up to 5 MB'

/** A picture on the bill — the logo, the signature, the bank's barcode. */
function PictureField({ label, hint, group, field, url, onSaved }) {
  const input = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const pick = async (file) => {
    if (!file) return
    if (!ACCEPTS.includes(file.type)) {
      return setError(`${file.type || 'That file'} will not do — use ${FORMATS}.`)
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      return setError(`That picture is ${(file.size / 1024 / 1024).toFixed(1)} MB — the limit is ${MAX_MB} MB.`)
    }
    setBusy(true)
    setError('')
    try {
      const body = new FormData()
      body.append('image', file, file.name)
      // The shared client sends JSON by default. Clearing the header lets the
      // browser set the multipart boundary itself — without it the server
      // receives no file at all and asks for one that was already chosen.
      const { data } = await api.post(`/settings/${group}/${field}/image`, body, {
        headers: { 'Content-Type': undefined },
      })
      onSaved(data.data.url)
    } catch (e) {
      setError(e?.response?.data?.message ?? 'Could not upload that picture.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-ink">{label}</p>
      <div className="flex items-center gap-3">
        <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-xl border border-mint-pale bg-bg">
          {url ? <img src={url} alt="" className="size-full object-contain" /> : <ImageIcon className="size-5 text-ink-muted" />}
        </div>
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-xl border border-mint-pale px-3 py-2 text-sm font-semibold text-ink hover:bg-bg disabled:opacity-50"
          >
            {busy && <Loader2 className="size-3.5 animate-spin" />}
            {url ? 'Replace' : 'Upload'}
          </button>
          {hint && <p className="text-xs text-ink-muted">{hint}</p>}
          <p className="text-xs text-ink-muted">{FORMATS}</p>
          {error && <p className="text-xs font-medium text-destructive">{error}</p>}
        </div>
      </div>
      <input
        ref={input}
        type="file"
        accept={ACCEPTS.join(',')}
        hidden
        onChange={(e) => {
          pick(e.target.files?.[0])
          e.target.value = ''
        }}
      />
    </div>
  )
}

/**
 * Settings › Bill template — the letterhead on the printed invoice.
 *
 * "लाइसेंस नंबर चेंज हो गया… एम एस एम नंबर… ईमेल आईडी… वेबसाइट… फ़ोन नंबर": the
 * words on the bill belong to the company and change over the years, so they
 * are edited here rather than living in the code. The layout stays ours.
 */
export function BillTemplate({ company, bank, onChange, onChangeBank }) {
  const field = (label, key, props = {}) => (
    <TextField id={`bill-${key}`} label={label} size="md" value={company[key] ?? ''} onChange={(e) => onChange(key, e.target.value)} {...props} />
  )
  const bankField = (label, key, props = {}) => (
    <TextField id={`bill-${key}`} label={label} size="md" value={bank[key] ?? ''} onChange={(e) => onChangeBank(key, e.target.value)} {...props} />
  )

  return (
    <div className="space-y-5">
      <Card icon={FileText} title="Letterhead" hint="Printed across the top of every bill.">
        {field('Heading', 'heading', { placeholder: 'TAX INVOICE' })}
        {field('Company name', 'name')}
        <div className="sm:col-span-2">
          <TextAreaField id="bill-address" label="Address" rows={2} value={company.address ?? ''} onChange={(e) => onChange('address', e.target.value)} />
        </div>
        {field('Line under the name', 'tagline')}
        {field('Heading over the items', 'goodsHeading')}
        {field('GSTIN', 'gstin')}
        {field('Drug licence no.', 'drugLicence')}
        {field('CIN no.', 'cin')}
        {field('UDYAM registration no.', 'udyam')}
        {field('Phone numbers', 'phone')}
        {field('E-mail', 'email')}
        {field('Website', 'website')}
        <div className="sm:col-span-2">
          <TextAreaField
            id="bill-terms"
            label="Terms &amp; conditions"
            rows={6}
            maxLength={1500}
            placeholder={'GOODS ONCE SOLD WILL NOT BE TAKEN BACK.\nOUR RESPONSIBILITY CEASES AFTER DISPATCH.'}
            value={company.terms ?? ''}
            onChange={(e) => onChange('terms', e.target.value)}
          />
          <p className="mt-1.5 text-xs text-ink-muted">One condition per line. They print numbered, under every bill.</p>
        </div>
        <PictureField
          label="Logo"
          hint="Prints top-right. A PNG with a clear background works best."
          group="company"
          field="logoUrl"
          url={company.logoUrl}
          onSaved={(url) => onChange('logoUrl', url)}
        />
        <PictureField
          label="Signature"
          hint="Prints above “Authorised signatory”."
          group="company"
          field="signatureUrl"
          url={company.signatureUrl}
          onSaved={(url) => onChange('signatureUrl', url)}
        />
      </Card>

      <Card icon={Banknote} title="Bank account" hint="The account printed on the bill.">
        <div className="sm:col-span-2">{bankField('Account holder', 'accountHolder')}</div>
        {bankField('Bank name', 'bankName')}
        {bankField('Branch', 'branch')}
        {bankField('IFSC code', 'ifsc')}
        {bankField('Account number', 'accountNumber')}
      </Card>

      {/* Its own block rather than a second column of half-filled boxes: two
          accounts interleaved field by field read as one muddled account. */}
      <Card icon={Banknote} title="Alternate bank account" hint="Optional. Prints as a second column beside the first.">
        {bankField('Bank name', 'bankName2')}
        {bankField('Branch', 'branch2')}
        {bankField('IFSC code', 'ifsc2')}
        {bankField('Account number', 'accountNumber2')}
      </Card>

      <Card icon={QrCode} title="Barcode / QR" hint="Prints beside the bank box, for scanning a payment.">
        <div className="sm:col-span-2">
          <PictureField
            label="Barcode / QR"
            hint="A square image reads best."
            group="bank"
            field="barcodeUrl"
            url={bank.barcodeUrl}
            onSaved={(url) => onChangeBank('barcodeUrl', url)}
          />
        </div>
      </Card>
    </div>
  )
}
