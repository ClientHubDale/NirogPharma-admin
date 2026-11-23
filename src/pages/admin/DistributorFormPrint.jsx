import { useEffect, useState } from 'react'
import { Printer } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { formatINR, formatShortDate } from '@/lib/format'
import * as distributorsService from '@/services/distributorsService'

/**
 * A distributor's form, as the office files it.
 *
 * "वो फॉर्म है उसको प्रिंट निकाल के फाइल में लगाते हैं… वो ऐसे खुल के आए
 * ताकि डायरेक्ट उसका प्रिंट ले सके" — so this is a sheet, not a screen: it
 * opens standing alone, carries everything that was filled in, and prints
 * with one press. The documents photographed on the spot print with it,
 * because the point of the file is to hold them together.
 */

const Line = ({ label, children }) => (
  <div className="grid grid-cols-[9rem_1fr] gap-2 border-b border-black/10 py-1.5 text-[11px]">
    <span className="font-semibold tracking-wide text-ink-muted uppercase">{label}</span>
    <span className="break-words text-black">{children || '—'}</span>
  </div>
)

const Photo = ({ label, images }) => {
  const url = images?.[0]?.url
  return (
    <figure className="min-w-0">
      <figcaption className="mb-1 text-[10px] font-semibold tracking-wide text-ink-muted uppercase">{label}</figcaption>
      {url ? (
        <img src={url} alt={label} className="h-40 w-full rounded border border-black/20 object-contain" />
      ) : (
        <div className="grid h-40 w-full place-items-center rounded border border-dashed border-black/20 text-[10px] text-ink-muted">
          Not provided
        </div>
      )}
    </figure>
  )
}

export default function DistributorFormPrint() {
  const { distributorId } = useParams()
  const [firm, setFirm] = useState(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    distributorsService
      .getDistributor(distributorId)
      .then((row) => alive && setFirm(row))
      .catch(() => alive && setFailed(true))
    return () => {
      alive = false
    }
  }, [distributorId])

  // Opened with ?print=1 from the dashboard, the print dialog comes up on its
  // own — one press from the list to paper.
  useEffect(() => {
    if (!firm) return undefined
    if (!new URLSearchParams(window.location.search).has('print')) return undefined
    const timer = setTimeout(() => window.print(), 600)
    return () => clearTimeout(timer)
  }, [firm])

  if (failed) return <p className="p-8 text-center text-sm text-ink-muted">That distributor could not be found.</p>
  if (!firm) {
    return (
      <div className="grid min-h-60 place-items-center" role="status" aria-label="Loading the form">
        <span className="size-8 animate-spin rounded-full border-3 border-mint border-t-green-deep" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-8">
      <div className="mb-4 flex justify-end print:hidden">
        <Button type="button" onClick={() => window.print()}>
          <Printer data-icon="inline-start" /> Print
        </Button>
      </div>

      <article id="distributor-form" className="rounded border border-black/30 bg-white p-6">
        <header className="mb-4 border-b border-black pb-3 text-center">
          <h1 className="text-[15px] font-bold tracking-wide uppercase">Distributor Form</h1>
          <p className="text-[11px] text-ink-muted">Nirog Pharma Pvt. Ltd.</p>
        </header>

        <section className="grid gap-x-8 sm:grid-cols-2">
          <div>
            <Line label="Firm name">{firm.name}</Line>
            <Line label="Contact person">{firm.contactPerson}</Line>
            <Line label="Mobile">{firm.mobile}</Line>
            <Line label="Alternate">{firm.altMobile}</Line>
            <Line label="Email">{firm.email}</Line>
            <Line label="Address">{firm.address}</Line>
            <Line label="State / PIN">{[firm.state, firm.pincode].filter(Boolean).join(' · ')}</Line>
          </div>
          <div>
            <Line label="GSTIN">{firm.gstin}</Line>
            <Line label="Drug licence">{firm.drugLicence}</Line>
            <Line label="Party type">{firm.partyType}</Line>
            <Line label="Rate column">{firm.priceTier}</Line>
            <Line label="Credit limit">{firm.creditLimit ? formatINR(firm.creditLimit) : ''}</Line>
            <Line label="Credit days">{firm.creditDays || ''}</Line>
            <Line label="Weekly off">{firm.weeklyOff}</Line>
          </div>
        </section>

        <section className="mt-4 grid gap-x-8 sm:grid-cols-2">
          <div>
            <Line label="Manager">{firm.managerName}</Line>
            <Line label="Executive">{(firm.executives ?? []).map((e) => e.name).join(', ')}</Line>
          </div>
          <div>
            <Line label="Location">{firm.locationName}</Line>
            {/* The point the device took when the firm was added. */}
            <Line label="Coordinates">
              {firm.latitude != null && firm.longitude != null ? `${firm.latitude}, ${firm.longitude}` : ''}
            </Line>
            <Line label="Added on">{firm.createdAt ? formatShortDate(firm.createdAt) : ''}</Line>
          </div>
        </section>

        <section className="mt-5 border-t border-black/20 pt-4">
          <h2 className="mb-2 text-[11px] font-bold tracking-wide uppercase">Documents</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Photo label="Aadhaar — front" images={firm.aadhaarFront} />
            <Photo label="Aadhaar — back" images={firm.aadhaarBack} />
            <Photo label="Shop photo" images={firm.shopPhoto} />
            <Photo label="Signature" images={firm.signature} />
          </div>
        </section>

        <footer className="mt-8 flex justify-between gap-8 text-[11px]">
          <span className="w-48 border-t border-black pt-1 text-center">Distributor signature</span>
          <span className="w-48 border-t border-black pt-1 text-center">For Nirog Pharma Pvt. Ltd.</span>
        </footer>
      </article>
    </div>
  )
}
