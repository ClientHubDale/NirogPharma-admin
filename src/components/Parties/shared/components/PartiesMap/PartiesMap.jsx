import { useEffect, useState } from 'react'
import { AdvancedMarker, AdvancedMarkerAnchorPoint, APIProvider, InfoWindow, Map, useMap } from '@vis.gl/react-google-maps'
import { Info, MapPinOff } from 'lucide-react'
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM, GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_MAP_ID, hasGoogleMapsKey } from '@/constants/maps'
import { makeProjector } from '@/lib/geo'
import { PartyInfoCard } from './PartyInfoCard'
import { PartyPin } from './PartyPin'

function FitAll({ points }) {
  const map = useMap()
  const key = points.map((p) => p.id).join(',')
  useEffect(() => {
    if (!map || !points.length) return
    const bounds = new window.google.maps.LatLngBounds()
    points.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }))
    map.fitBounds(bounds, 48)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key])
  return null
}

function GooglePartiesMap({ parties, selected, onSelect, placeOf, onEdit }) {
  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY} region="IN">
      <Map mapId={GOOGLE_MAPS_MAP_ID} defaultCenter={DEFAULT_MAP_CENTER} defaultZoom={DEFAULT_MAP_ZOOM} gestureHandling="greedy" mapTypeControl fullscreenControl streetViewControl={false} clickableIcons={false} onClick={() => onSelect(null)} className="size-full">
        <FitAll points={parties} />
        {parties.map((c) => (
          <AdvancedMarker key={c.id} position={{ lat: c.lat, lng: c.lng }} anchorPoint={AdvancedMarkerAnchorPoint.BOTTOM} title={c.name} zIndex={c.id === selected?.id ? 10 : 1} onClick={() => onSelect(c.id)}>
            <span className="block pb-1.5">
              <PartyPin party={c} selected={c.id === selected?.id} />
            </span>
          </AdvancedMarker>
        ))}
        {selected && (
          <InfoWindow position={{ lat: selected.lat, lng: selected.lng }} pixelOffset={[0, -46]} headerDisabled onClose={() => onSelect(null)}>
            <PartyInfoCard party={selected} place={placeOf(selected)} onEdit={onEdit} onClose={() => onSelect(null)} />
          </InfoWindow>
        )}
      </Map>
    </APIProvider>
  )
}

function PreviewPartiesMap({ parties, selected, onSelect, placeOf, onEdit }) {
  const project = makeProjector(parties)
  return (
    <div className="relative size-full overflow-hidden bg-mint-pale/60" onClick={() => onSelect(null)}>
      <div aria-hidden className="absolute inset-0 [background-image:linear-gradient(var(--mint)_1px,transparent_1px),linear-gradient(90deg,var(--mint)_1px,transparent_1px)] [background-size:48px_48px] opacity-60" />
      <p className="absolute top-3 left-3 z-10 flex items-center gap-2 rounded-lg bg-white/90 px-3 py-2 text-xs font-medium text-ink shadow-sm">
        <Info className="size-3.5 text-green-deep" /> Preview map
        {import.meta.env.DEV && <span className="hidden sm:inline">— add VITE_GOOGLE_MAPS_API_KEY for Google Maps</span>}
      </p>
      {parties.map((c) => {
        const at = project(c)
        const isSel = c.id === selected?.id
        return (
          <button
            key={c.id}
            type="button"
            title={c.name}
            aria-label={`${c.name} on map`}
            onClick={(e) => {
              e.stopPropagation()
              onSelect(c.id)
            }}
            className="absolute -translate-x-1/2 -translate-y-full pb-1.5"
            style={{ left: `${at.x}%`, top: `${at.y}%`, zIndex: isSel ? 10 : 1 }}
          >
            <PartyPin party={c} selected={isSel} />
          </button>
        )
      })}
      {selected && (
        <div className="absolute right-3 bottom-3 z-20 rounded-xl shadow-lift" onClick={(e) => e.stopPropagation()}>
          <PartyInfoCard party={selected} place={placeOf(selected)} onEdit={onEdit} onClose={() => onSelect(null)} />
        </div>
      )}
    </div>
  )
}

/** Parties on a map (only those with a captured location). `noun` = "customer" / "supplier". */
export function PartiesMap({ parties, placeOf, onEdit, noun = 'party' }) {
  const plural = noun === 'party' ? 'parties' : `${noun}s`
  const [selectedId, setSelectedId] = useState(null)
  const located = parties.filter((c) => c.lat !== null && c.lng !== null)
  const selected = located.find((c) => c.id === selectedId) ?? null
  const missing = parties.length - located.length
  const Impl = hasGoogleMapsKey ? GooglePartiesMap : PreviewPartiesMap

  return (
    <div>
      <div className="h-[65vh] min-h-96">
        {located.length ? (
          <Impl parties={located} selected={selected} onSelect={setSelectedId} placeOf={placeOf} onEdit={onEdit} />
        ) : (
          <div className="grid size-full place-items-center bg-bg text-sm text-ink-muted">No {plural} with a location match these filters.</div>
        )}
      </div>
      {missing > 0 && (
        <p className="flex items-center gap-2 border-t border-mint-pale bg-bg px-4 py-2.5 text-xs text-ink-muted">
          <MapPinOff className="size-3.5" /> {missing} {missing === 1 ? noun : plural} in this view have no location yet and aren’t shown.
        </p>
      )}
    </div>
  )
}
