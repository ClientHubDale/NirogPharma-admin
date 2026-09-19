import { useEffect } from 'react'
import {
  AdvancedMarker,
  AdvancedMarkerAnchorPoint,
  APIProvider,
  InfoWindow,
  Map,
  Polyline,
  useMap,
} from '@vis.gl/react-google-maps'
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM, GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_MAP_ID } from '@/constants/maps'
import { useThemeColors } from '@/hooks/useThemeColors'
import { TrackMarker } from './TrackMarker'
import { UserInfoCard } from './UserInfoCard'
import { UserPin } from './UserPin'

/** Fits the view to a set of points whenever that set changes. */
function FitToPoints({ points, fitKey }) {
  const map = useMap()
  useEffect(() => {
    if (!map || points.length === 0) return
    if (points.length === 1) {
      map.panTo(points[0])
      map.setZoom(13)
      return
    }
    const bounds = new window.google.maps.LatLngBounds()
    points.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }))
    map.fitBounds(bounds, 64)
    // Refit only when the set of points changes, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, fitKey])
  return null
}

/** Pans to a point (selected user or timeline entry). */
function PanTo({ point }) {
  const map = useMap()
  const lat = point?.lat
  const lng = point?.lng
  useEffect(() => {
    if (map && lat !== undefined) map.panTo({ lat, lng })
  }, [map, lat, lng])
  return null
}

function PinMarker({ user, selected, onSelect }) {
  return (
    <AdvancedMarker
      position={{ lat: user.lat, lng: user.lng }}
      anchorPoint={AdvancedMarkerAnchorPoint.BOTTOM}
      zIndex={selected ? 10 : 1}
      title={user.name}
      onClick={() => onSelect(user.id)}
    >
      {/* pb pushes the anchor down to the tip of the rotated pin */}
      <span className="block pb-2">
        <UserPin user={user} selected={selected} />
      </span>
    </AdvancedMarker>
  )
}

/** Route line + entry markers + the user's pin at the end (if still out). */
function TrackLayer({ track, selectedUser, onSelect }) {
  const c = useThemeColors(['--green-deep', '--white'])
  const { user, data, activeEntryId, onSelectEntry } = track
  const end = data.points[data.points.length - 1]
  const active = data.entries.find((e) => e.id === activeEntryId)

  return (
    <>
      <FitToPoints points={data.points} fitKey={`${user.id}|${data.points.length}|${data.checkedInAt?.getTime()}`} />
      <PanTo point={active} />
      <Polyline path={data.points} strokeColor={c.white} strokeWeight={8} strokeOpacity={1} />
      <Polyline path={data.points} strokeColor={c.greenDeep} strokeWeight={4} strokeOpacity={1} />
      {data.entries.map((entry) =>
        entry.type === 'live' ? null : (
          <AdvancedMarker
            key={entry.id}
            position={{ lat: entry.lat, lng: entry.lng }}
            anchorPoint={AdvancedMarkerAnchorPoint.CENTER}
            zIndex={entry.id === activeEntryId ? 15 : 2}
          >
            <TrackMarker
              entry={entry}
              active={entry.id === activeEntryId}
              onClick={() => onSelectEntry(entry.id === activeEntryId ? null : entry.id)}
            />
          </AdvancedMarker>
        ),
      )}
      {data.checkedOutAt === null && end && (
        <PinMarker user={{ ...user, lat: end.lat, lng: end.lng }} selected={selectedUser?.id === user.id} onSelect={onSelect} />
      )}
    </>
  )
}

/**
 * Real Google map. Map / Satellite toggle, fullscreen and zoom are Google's
 * own controls; markers are custom (AdvancedMarker).
 * Without `track`: everyone's live pins. With `track`: one user's day.
 */
export function GoogleLiveMap({ users, selectedUser, onSelect, track }) {
  const selectedOnMap = selectedUser && selectedUser.lat !== null ? selectedUser : null

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY} region="IN">
      <Map
        mapId={GOOGLE_MAPS_MAP_ID}
        defaultCenter={DEFAULT_MAP_CENTER}
        defaultZoom={DEFAULT_MAP_ZOOM}
        gestureHandling="greedy"
        mapTypeControl
        fullscreenControl
        streetViewControl={false}
        clickableIcons={false}
        onClick={() => onSelect(null)}
        className="size-full"
      >
        {track ? (
          <TrackLayer track={track} selectedUser={selectedUser} onSelect={onSelect} />
        ) : (
          <>
            <FitToPoints points={users} fitKey={users.map((u) => u.id).join(',')} />
            <PanTo point={selectedOnMap} />
            {users.map((user) => (
              <PinMarker key={user.id} user={user} selected={user.id === selectedUser?.id} onSelect={onSelect} />
            ))}
          </>
        )}

        {selectedOnMap && (
          <InfoWindow
            position={{ lat: selectedOnMap.lat, lng: selectedOnMap.lng }}
            pixelOffset={[0, -58]}
            headerDisabled
            onClose={() => onSelect(null)}
          >
            <UserInfoCard user={selectedOnMap} onClose={() => onSelect(null)} className="p-1" />
          </InfoWindow>
        )}
      </Map>
    </APIProvider>
  )
}
