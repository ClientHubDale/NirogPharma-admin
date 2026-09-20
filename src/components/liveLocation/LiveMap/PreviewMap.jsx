import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatClock } from '@/lib/format'
import { makeProjector } from '@/lib/geo'
import { TrackMarker } from './TrackMarker'
import { UserInfoCard } from './UserInfoCard'
import { UserPin } from './UserPin'

function Notice() {
  return (
    <p className="absolute top-3 left-3 z-10 flex max-w-[calc(100%-1.5rem)] items-center gap-2 rounded-lg bg-white/90 px-3 py-2 text-xs font-medium text-ink shadow-sm backdrop-blur">
      <Info className="size-3.5 shrink-0 text-green-deep" />
      <span>
        Preview map
        {import.meta.env.DEV && (
          <span className="hidden sm:inline">
            {' '}
            — add <code className="font-mono">VITE_GOOGLE_MAPS_API_KEY</code> to .env for Google Maps
          </span>
        )}
      </span>
    </p>
  )
}

function Grid() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 [background-image:linear-gradient(var(--mint)_1px,transparent_1px),linear-gradient(90deg,var(--mint)_1px,transparent_1px)] [background-size:48px_48px] opacity-60"
    />
  )
}

/** Positioned child of the preview map, anchored at its bottom-centre. */
function Placed({ at, zIndex = 1, children, className, ...props }) {
  return (
    <div
      className={cn('absolute -translate-x-1/2 -translate-y-full', className)}
      style={{ left: `${at.x}%`, top: `${at.y}%`, zIndex }}
      {...props}
    >
      {children}
    </div>
  )
}

/** One user's day: route line, start dot, visit markers, and their pin at the end. */
function TrackLayer({ user, track, activeEntryId, onSelectUser, onSelectEntry }) {
  const project = makeProjector(track.points)
  const line = track.points.map((p) => {
    const { x, y } = project(p)
    return `${x},${y}`
  })
  const end = track.points[track.points.length - 1]
  const active = track.entries.find((e) => e.id === activeEntryId)

  return (
    <>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full" aria-hidden>
        <polyline
          points={line.join(' ')}
          fill="none"
          className="stroke-white"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        <polyline
          points={line.join(' ')}
          fill="none"
          className="stroke-green-deep"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {track.entries.map((entry) => {
        if (entry.type === 'live') return null
        const at = project(entry)
        const isActive = entry.id === activeEntryId
        return (
          <div
            key={entry.id}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${at.x}%`, top: `${at.y}%`, zIndex: isActive ? 15 : 2 }}
          >
            <TrackMarker entry={entry} active={isActive} onClick={() => onSelectEntry(isActive ? null : entry.id)} />
          </div>
        )
      })}

      {track.checkedOutAt === null && (
        <Placed at={project(end)} zIndex={12}>
          <button
            type="button"
            title={user.name}
            onClick={(e) => {
              e.stopPropagation()
              onSelectUser(user.id)
            }}
            className="block pb-2"
          >
            <UserPin user={user} selected />
          </button>
        </Placed>
      )}

      {active && (
        <p className="absolute bottom-3 left-3 z-20 max-w-[calc(100%-1.5rem)] rounded-lg bg-black px-3 py-2 text-xs text-white shadow-lift">
          <span className="font-semibold">{active.title}</span>
          <span className="text-white/70"> · {active.subtitle ? `${active.subtitle} · ` : ''}{formatClock(active.at)}</span>
        </p>
      )}
    </>
  )
}

/**
 * Stand-in map used while no Google Maps key is configured (UI phase).
 * Places pins by projecting lat/lng into the box — relative positions are
 * right, but there are no roads or labels. Disappears once
 * VITE_GOOGLE_MAPS_API_KEY is set.
 */
export function PreviewMap({ users, selectedUser, onSelect, track }) {
  const selectedOnMap = selectedUser && selectedUser.lat !== null ? selectedUser : null
  const project = makeProjector(users)

  return (
    <div className="relative size-full overflow-hidden bg-mint-pale/60" onClick={() => onSelect(null)}>
      <Grid />
      <Notice />

      {track ? (
        track.data.points.length ? (
          <TrackLayer
            user={track.user}
            track={track.data}
            activeEntryId={track.activeEntryId}
            onSelectUser={onSelect}
            onSelectEntry={track.onSelectEntry}
          />
        ) : (
          <p className="absolute inset-0 grid place-items-center text-sm font-medium text-ink-muted">
            No route recorded for this day.
          </p>
        )
      ) : (
        users.map((user) => {
          const at = project(user)
          const selected = user.id === selectedUser?.id
          return (
            <Placed key={user.id} at={at} zIndex={selected ? 10 : 1}>
              <button
                type="button"
                title={user.name}
                aria-label={`${user.name}, ${user.area}`}
                onClick={(e) => {
                  e.stopPropagation()
                  onSelect(user.id)
                }}
                className="relative block pb-2"
              >
                <UserPin user={user} selected={selected} />
                <span className="absolute top-full left-1/2 mt-0.5 -translate-x-1/2 rounded bg-white/85 px-1.5 text-[0.65rem] font-semibold whitespace-nowrap text-forest">
                  {user.area}
                </span>
              </button>
            </Placed>
          )
        })
      )}

      {selectedOnMap && (
        <div className="absolute right-3 bottom-3 z-30 rounded-xl shadow-lift" onClick={(e) => e.stopPropagation()}>
          <UserInfoCard user={selectedOnMap} onClose={() => onSelect(null)} />
        </div>
      )}
    </div>
  )
}
