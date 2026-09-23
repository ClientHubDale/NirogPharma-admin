import { useMemo, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { useSelector } from 'react-redux'
import { LiveMap } from '@/components/liveLocation/LiveMap'
import { StatusFilterBar } from '@/components/liveLocation/StatusFilterBar'
import { UserListPanel } from '@/components/liveLocation/UserListPanel'
import { UserTrackPanel } from '@/components/liveLocation/UserTrackPanel'
import { Button } from '@/components/ui/button'
import { LIVE_FILTERS, liveStatusOf, matchesFilter } from '@/lib/liveStatus'
import { fieldStaff } from '@/mocks/liveLocation'
import { getUserTrack, todayISO } from '@/mocks/userTracks'
import { DOC_TYPES, titleCase } from '@/components/Transactions/docTypes'
import { docTotals, lineTotals } from '@/components/Transactions/transactionModel'
import { selectParties } from '@/store/partiesSlice'
import { selectDocs } from '@/store/transactionsSlice'


const STATUS_ORDER = { live: 0, active: 1, offline: 2 }

/**
 * Two modes:
 *  - overview: everyone's pins + the Users list. Clicking a pin opens its popup card.
 *  - track:    clicking a user in the list opens their day — route on the map,
 *              distance/time and the entries timeline in the side panel.
 */
export default function LiveLocation() {
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState(null) // popup card
  const [trackUserId, setTrackUserId] = useState(null) // side-panel detail
  const [trackDate, setTrackDate] = useState(todayISO)
  const [activeEntryId, setActiveEntryId] = useState(null)
  const [updatedAt, setUpdatedAt] = useState(() => new Date())

  const counts = useMemo(
    () => Object.fromEntries(LIVE_FILTERS.map((f) => [f, fieldStaff.filter((u) => matchesFilter(u, f)).length])),
    [],
  )

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return fieldStaff
      .filter((u) => matchesFilter(u, filter))
      .filter((u) => !q || u.name.toLowerCase().includes(q) || u.area?.toLowerCase().includes(q))
      .sort(
        (a, b) =>
          STATUS_ORDER[liveStatusOf(a)] - STATUS_ORDER[liveStatusOf(b)] || a.name.localeCompare(b.name),
      )
  }, [filter, query])

  const trackUser = fieldStaff.find((u) => u.id === trackUserId) ?? null
  const trackData = trackUser ? getUserTrack(trackUser, trackDate) : null

  // Secondary sales = what this user sold to retailers that day.
  const orders = useSelector(selectDocs('SALES_ORDER'))
  const invoices = useSelector(selectDocs('SALES_INVOICE'))
  const customers = useSelector(selectParties('CUSTOMER'))
  const userSales = useMemo(() => {
    if (!trackUser) return []
    const partyName = Object.fromEntries(customers.map((c) => [c.id, c.name]))
    return [...orders, ...invoices]
      .filter((doc) => doc.createdBy === trackUser.id && doc.date === trackDate)
      .map((doc) => {
        const config = DOC_TYPES[doc.type]
        const status = config.statuses.find((st) => st.value === doc.status)
        return {
          id: doc.id,
          kind: titleCase(config.noun),
          number: doc.number,
          partyName: partyName[doc.partyId] ?? 'Deleted party',
          status: status?.label ?? doc.status,
          tone: status?.tone ?? 'neutral',
          total: docTotals(doc, customers.find((c) => c.id === doc.partyId)).total,
          qty: doc.lines.reduce((sum, line) => sum + (Number(line.qty) || 0), 0),
          lines: doc.lines.map((line) => ({ ...line, amount: lineTotals(line).amount })),
        }
      })
      .sort((a, b) => b.total - a.total)
  }, [orders, invoices, customers, trackUser, trackDate])
  const selectedUser = fieldStaff.find((u) => u.id === selectedId) ?? null

  const openTrack = (id) => {
    setTrackUserId(id)
    setTrackDate(todayISO())
    setActiveEntryId(null)
    setSelectedId(null)
  }

  const closeTrack = () => {
    setTrackUserId(null)
    setActiveEntryId(null)
  }

  return (
    <div className="mx-auto flex max-w-[110rem] flex-col gap-4 lg:h-[calc(100dvh-8rem)]">
      <div className="flex flex-col gap-4 rounded-2xl border border-mint-pale bg-white p-4 xl:flex-row xl:items-center xl:gap-6">
        <div className="flex items-center justify-between gap-3 xl:w-64 xl:shrink-0 xl:flex-col xl:items-start xl:gap-1">
          <h1 className="text-2xl font-extrabold">Live Location</h1>
          <p className="flex items-center gap-2 text-xs text-ink-muted">
            Updated {updatedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Refresh locations"
              onClick={() => setUpdatedAt(new Date())}
              className="text-green-deep"
            >
              <RefreshCw />
            </Button>
          </p>
        </div>
        <div className="flex-1">
          <StatusFilterBar
            counts={counts}
            value={filter}
            onChange={(next) => {
              setFilter(next)
              setSelectedId(null)
              closeTrack()
            }}
          />
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="h-[60vh] min-h-0 overflow-hidden rounded-2xl border border-mint-pale lg:h-auto">
          <LiveMap
            users={visible}
            selectedUser={selectedUser}
            onSelect={setSelectedId}
            track={
              trackUser
                ? { user: trackUser, data: trackData, activeEntryId, onSelectEntry: setActiveEntryId }
                : undefined
            }
          />
        </div>

        {trackUser ? (
          <UserTrackPanel
            user={trackUser}
            track={trackData}
            sales={userSales}
            date={trackDate}
            onDateChange={(date) => {
              setTrackDate(date)
              setActiveEntryId(null)
            }}
            activeEntryId={activeEntryId}
            onEntrySelect={setActiveEntryId}
            onBack={closeTrack}
            className="max-h-[80vh] lg:max-h-none"
          />
        ) : (
          <UserListPanel
            users={visible}
            query={query}
            onQueryChange={setQuery}
            selectedId={selectedId}
            onSelect={openTrack}
            className="max-h-[70vh] lg:max-h-none"
          />
        )}
      </div>
    </div>
  )
}
