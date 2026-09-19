import { hasGoogleMapsKey } from '@/constants/maps'
import { GoogleLiveMap } from './GoogleLiveMap'
import { PreviewMap } from './PreviewMap'

/**
 * Google Maps when a key is configured, otherwise the preview map.
 * Only users with a location are plotted.
 * `track` ({ user, data, activeEntryId, onSelectEntry }) switches to one user's day.
 */
export function LiveMap({ users, selectedUser, onSelect, track }) {
  const located = users.filter((user) => user.lat !== null && user.lng !== null)
  const Impl = hasGoogleMapsKey ? GoogleLiveMap : PreviewMap
  return <Impl users={located} selectedUser={selectedUser} onSelect={onSelect} track={track} />
}
