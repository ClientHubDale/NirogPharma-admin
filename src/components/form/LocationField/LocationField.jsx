import { useEffect, useRef, useState } from 'react'
import { ExternalLink, LocateFixed, MapPin, Search, X } from 'lucide-react'
import { Popover } from 'radix-ui'
import { Label } from '@/components/ui/label'
import { googleMapsUrl } from '@/lib/geo'
import { reverseGeocode, searchPlaces } from '@/lib/places'
import { cn } from '@/lib/utils'

/**
 * Where a place actually is. Two ways to fill it: search for it by name and
 * pick from the results, or take the device's current position — which is what
 * the person filling the form in front of the shop will use.
 *
 * value: { name, lat, lng } — lat/lng are numbers or null.
 */
export function LocationField({ id, label = 'Location', required, value, onChange, error, className, hint }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const tooShort = query.trim().length < 3
  const [searching, setSearching] = useState(false)
  const [note, setNote] = useState('')
  const [locating, setLocating] = useState(false)
  const [portalContainer, setPortalContainer] = useState(undefined)
  const triggerRef = useRef(null)

  const picked = value?.lat !== null && value?.lat !== undefined

  // One request a second at most, as the geocoder asks — and the last one wins.
  useEffect(() => {
    if (!open || tooShort) return undefined

    const text = query.trim()
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setSearching(true)
      setNote('')
      try {
        setResults(await searchPlaces(text, { signal: controller.signal }))
      } catch (searchError) {
        if (searchError.name !== 'AbortError') setNote('Could not reach the place search. Check your connection.')
      } finally {
        setSearching(false)
      }
    }, 600)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query, open, tooShort])

  const choose = (place) => {
    onChange({ name: [place.label, place.detail].filter(Boolean).join(', '), lat: place.lat, lng: place.lng })
    setOpen(false)
    setQuery('')
  }

  const useCurrentLocation = () => {
    if (!navigator.geolocation) return setNote('This browser cannot share a location.')
    setLocating(true)
    setNote('')

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const point = { lat: Number(position.coords.latitude.toFixed(6)), lng: Number(position.coords.longitude.toFixed(6)) }
        // Show the point immediately; the name catches up if the lookup works.
        onChange({ name: '', ...point })
        setLocating(false)
        try {
          const name = await reverseGeocode(point)
          if (name) onChange({ name, ...point })
        } catch {
          // A point with no name is still a usable location.
        }
      },
      (positionError) => {
        setNote(positionError.code === 1 ? 'Location permission was denied.' : 'Could not get a location fix.')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  return (
    <div className={className}>
      <Label htmlFor={id} className="mb-2 font-semibold text-ink">
        {label}
        {required && <span className="text-danger">*</span>}
      </Label>

      <div className="flex gap-2">
        <Popover.Root
          open={open}
          onOpenChange={(next) => {
            setOpen(next)
            if (next) {
              setQuery('')
              setResults([])
              setPortalContainer(triggerRef.current?.closest('[role=dialog]') ?? undefined)
            }
          }}
        >
          <Popover.Trigger
            ref={triggerRef}
            id={id}
            type="button"
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            className={cn(
              'flex h-11 min-w-0 flex-1 items-center gap-2 rounded-lg border bg-white px-3.5 text-left text-sm outline-none transition-[border-color,box-shadow]',
              error ? 'border-destructive' : 'border-mint focus-visible:border-green-fresh focus-visible:ring-3 focus-visible:ring-ring/25',
              open && !error && 'border-green-fresh ring-3 ring-ring/25',
            )}
          >
            <MapPin className={cn('size-4 shrink-0', picked ? 'text-green-deep' : 'text-ink-muted')} aria-hidden />
            <span className={cn('min-w-0 flex-1 truncate', picked ? 'text-ink' : 'text-ink-muted/70')}>
              {value?.name || (picked ? `${value.lat}, ${value.lng}` : 'Search for a location')}
            </span>
            {picked && (
              <span
                role="button"
                tabIndex={0}
                aria-label="Clear location"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  onChange({ name: '', lat: null, lng: null })
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    e.stopPropagation()
                    onChange({ name: '', lat: null, lng: null })
                  }
                }}
                className="grid size-5 shrink-0 place-items-center rounded text-ink-muted hover:bg-bg hover:text-black"
              >
                <X className="size-3.5" />
              </span>
            )}
          </Popover.Trigger>

          <Popover.Portal container={portalContainer}>
            <Popover.Content
              align="start"
              sideOffset={6}
              collisionPadding={12}
              className="z-50 flex max-h-(--radix-popover-content-available-height) w-(--radix-popover-trigger-width) min-w-72 flex-col overflow-hidden rounded-xl border border-mint-pale bg-white shadow-lift outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
            >
              <label className="flex items-center gap-2 border-b border-mint-pale px-3">
                <Search className="size-4 text-ink-muted" aria-hidden />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Type an area, landmark or address…"
                  aria-label="Search for a location"
                  className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-ink-muted/70"
                />
              </label>

              <ul role="listbox" className="max-h-64 min-h-0 flex-1 overflow-y-auto p-1.5">
                {searching && <li className="px-3 py-2.5 text-sm text-ink-muted">Searching…</li>}
                {!searching && tooShort && <li className="px-3 py-2.5 text-sm text-ink-muted">Type at least three letters.</li>}
                {!searching && !tooShort && results.length === 0 && (
                  <li className="px-3 py-2.5 text-sm text-ink-muted">No places match.</li>
                )}
                {!tooShort &&
                  results.map((place) => (
                    <li
                      key={place.id}
                      role="option"
                      aria-selected={false}
                      onClick={() => choose(place)}
                      className="cursor-pointer rounded-lg px-3 py-2 hover:bg-mint-pale"
                    >
                      <p className="text-sm font-semibold text-black">{place.label}</p>
                      {place.detail && <p className="truncate text-xs text-ink-muted">{place.detail}</p>}
                    </li>
                  ))}
              </ul>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>

        <button
          type="button"
          onClick={useCurrentLocation}
          disabled={locating}
          className="flex h-11 shrink-0 items-center gap-1.5 rounded-lg border border-mint bg-bg px-3.5 text-sm font-semibold text-green-deep hover:bg-mint-pale disabled:opacity-60"
        >
          <LocateFixed className="size-4" />
          {locating ? 'Locating…' : 'Use current location'}
        </button>
      </div>

      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm font-medium text-destructive">
          {error}
        </p>
      )}
      {note && <p className="mt-1.5 text-sm text-ink-muted">{note}</p>}

      {picked && (
        <p className="mt-1.5 flex items-center gap-2 text-xs text-ink-muted">
          <span className="font-mono">
            {value.lat}, {value.lng}
          </span>
          <a
            href={googleMapsUrl(value.lat, value.lng)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-green-deep hover:underline"
          >
            View on map <ExternalLink className="size-3" />
          </a>
        </p>
      )}

      {!picked && !note && hint && <p className="mt-1.5 text-xs text-ink-muted">{hint}</p>}
    </div>
  )
}
