import { useEffect, useMemo, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { LiveMap } from '@/components/liveLocation/LiveMap'
import { StatusFilterBar } from '@/components/liveLocation/StatusFilterBar'
import { UserListPanel } from '@/components/liveLocation/UserListPanel'
import { UserTrackPanel } from '@/components/liveLocation/UserTrackPanel'
import { Button } from '@/components/ui/button'
import { LIVE_FILTERS, liveStatusOf, matchesFilter } from '@/lib/liveStatus'
import { todayISO } from '@/lib/day'
import * as trackingService from '@/services/trackingService'
import { listOrders } from '@/services/ordersService'
import { STATUS_LABEL, STATUS_TONE } from '@/components/Sales/SalesOrders/orderModel'


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

  const [staff, setStaff] = useState([])
  const [track, setTrack] = useState(null)
  const [orders, setOrders] = useState([])

  /**
   * The roster, re-read whenever Refresh is pressed. `updatedAt` is both the
   * timestamp the header prints and what asks for a fresh read, so the button
   * that already existed now actually fetches.
   */
  useEffect(() => {
    let alive = true
    trackingService
      .live()
      .then((rows) => alive && setStaff(rows))
      .catch(() => alive && setStaff([]))
    return () => {
      alive = false
    }
  }, [updatedAt])

  /** One person's day, re-read when the person or the date changes. */
  useEffect(() => {
    if (!trackUserId) {
      setTrack(null)
      return undefined
    }
    let alive = true
    setTrack(null)
    trackingService
      .track(trackUserId, trackDate)
      .then((found) => alive && setTrack(found))
      .catch(() => alive && setTrack(trackingService.emptyTrack(trackUserId, trackDate)))
    return () => {
      alive = false
    }
  }, [trackUserId, trackDate, updatedAt])

  /**
   * What they sold that day — the Secondary sales tab.
   *
   * Orders only. An order records who booked it; a bill does not, because
   * only the office writes one, so there is no field author to attribute a
   * bill to.
   */
  useEffect(() => {
    if (!trackUserId) {
      setOrders([])
      return undefined
    }
    let alive = true
    listOrders({ limit: 200 })
      .then(({ orders: rows }) => alive && setOrders(rows ?? []))
      .catch(() => alive && setOrders([]))
    return () => {
      alive = false
    }
  }, [trackUserId, trackDate])

  const counts = useMemo(
    () => Object.fromEntries(LIVE_FILTERS.map((f) => [f, staff.filter((u) => matchesFilter(u, f)).length])),
    [staff],
  )

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return staff
      .filter((u) => matchesFilter(u, filter))
      .filter((u) => !q || u.name.toLowerCase().includes(q) || u.area?.toLowerCase().includes(q))
      .sort(
        (a, b) =>
          STATUS_ORDER[liveStatusOf(a)] - STATUS_ORDER[liveStatusOf(b)] || a.name.localeCompare(b.name),
      )
  }, [staff, filter, query])

  const trackUser = staff.find((u) => u.id === trackUserId) ?? null
  // The panel formats these totals without checking them, so it is given an
  // empty day rather than null while the real one is still on its way.
  const trackData = trackUser ? (track ?? trackingService.emptyTrack(trackUserId, trackDate)) : null

  /**
   * Secondary sales — what this person booked that day.
   *
   * The shop or doctor it was booked at is the party where there is one; an
   * order the office typed has no shop behind it, so it falls back to the
   * firm being billed.
   */
  const userSales = useMemo(() => {
    if (!trackUser) return []
    return orders
      .filter((order) => order.takenById === trackUser.id && order.orderDate === trackDate)
      .map((order) => ({
        id: order.id,
        kind: 'Order',
        number: order.orderNo,
        partyName: order.shopName || order.distributorName || 'Unknown party',
        status: STATUS_LABEL[order.status] ?? order.status,
        tone: STATUS_TONE[order.status] ?? 'neutral',
        total: Number(order.total) || 0,
        qty: (order.lines ?? []).reduce((sum, line) => sum + (Number(line.quantity) || 0), 0),
        lines: (order.lines ?? []).map((line) => ({
          key: line.id,
          name: line.itemName,
          qty: Number(line.quantity) || 0,
          unit: line.unit,
          rate: Number(line.rate) || 0,
          amount: Number(line.total) || 0,
          free: Number(line.freeQty) || 0,
          schemeName: line.freeLabel,
        })),
      }))
      .sort((a, b) => b.total - a.total)
  }, [orders, trackUser, trackDate])

  const selectedUser = staff.find((u) => u.id === selectedId) ?? null

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
