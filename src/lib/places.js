/**
 * Looking a place up by name, and naming a pair of coordinates.
 *
 * Google Places needs VITE_GOOGLE_MAPS_API_KEY (and its JS SDK, since the REST
 * endpoint refuses browser calls). While that is empty the app falls back to
 * OpenStreetMap's Nominatim, which needs no key — fine for the office, but it
 * asks for no more than one request a second, so every caller debounces.
 *
 * Swapping to Google later is this file only: keep `searchPlaces` and
 * `reverseGeocode` returning the same shapes.
 */
import { GOOGLE_MAPS_API_KEY } from '@/constants/maps'

const NOMINATIM = 'https://nominatim.openstreetmap.org'

/** Results are `{ id, label, detail, lat, lng }`. */
const fromNominatim = (place) => {
  const [first, ...rest] = String(place.display_name ?? '').split(',')
  return {
    id: String(place.place_id),
    label: first?.trim() || place.display_name,
    detail: rest.join(',').trim(),
    lat: Number(place.lat),
    lng: Number(place.lon),
  }
}

/**
 * Places matching what was typed. India only, because that is where the field
 * team is; drop `countrycodes` when that stops being true.
 */
export async function searchPlaces(query, { signal, limit = 8 } = {}) {
  const text = query.trim()
  if (text.length < 3) return []

  const url = `${NOMINATIM}/search?format=jsonv2&addressdetails=1&countrycodes=in&limit=${limit}&q=${encodeURIComponent(text)}`
  const response = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`Place search failed (${response.status})`)

  const places = await response.json()
  return places.map(fromNominatim)
}

/** A readable name for a point — used after "Use current location". */
export async function reverseGeocode({ lat, lng }, { signal } = {}) {
  const url = `${NOMINATIM}/reverse?format=jsonv2&addressdetails=1&lat=${lat}&lon=${lng}`
  const response = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  if (!response.ok) return ''

  const place = await response.json()
  return place?.display_name ?? ''
}

/** True once a Google key is configured — then this module should use Places. */
export const usingGooglePlaces = Boolean(GOOGLE_MAPS_API_KEY)
