/** Geo helpers shared by the preview maps and location fields. */

const PAD_X = 0.08
const PAD_TOP = 0.2 // clear of the map's notice banner
const PAD_BOTTOM = 0.1

/** Maps { lat, lng } points into 0–100% box coordinates spanning them all. */
export function makeProjector(points) {
  if (points.length <= 1) return () => ({ x: 50, y: 50 })
  const lats = points.map((p) => p.lat)
  const lngs = points.map((p) => p.lng)
  const [minLat, maxLat] = [Math.min(...lats), Math.max(...lats)]
  const [minLng, maxLng] = [Math.min(...lngs), Math.max(...lngs)]
  const spanLat = maxLat - minLat || 1
  const spanLng = maxLng - minLng || 1
  const x = (v) => (PAD_X + v * (1 - 2 * PAD_X)) * 100
  const y = (v) => (PAD_TOP + v * (1 - PAD_TOP - PAD_BOTTOM)) * 100
  return (p) => ({ x: x((p.lng - minLng) / spanLng), y: y(1 - (p.lat - minLat) / spanLat) })
}

/** "22.7196, 75.8577" → { lat, lng } | null. Accepts spaces/commas. */
export function parseLatLng(text) {
  const m = /^\s*(-?\d{1,2}(?:\.\d+)?)\s*[, ]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/.exec(text ?? '')
  if (!m) return null
  const lat = Number(m[1])
  const lng = Number(m[2])
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 ? { lat, lng } : null
}

/** Rough India bounding box — catches swapped lat/lng and typos. */
export const isInIndia = ({ lat, lng }) => lat >= 6 && lat <= 37.5 && lng >= 68 && lng <= 97.5

export const formatLatLng = (lat, lng) => (lat === null || lat === undefined ? '' : `${lat}, ${lng}`)

export const googleMapsUrl = (lat, lng) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`

/** Great-circle distance in km between two { lat, lng } points. */
export function haversineKm(a, b) {
  const R = 6371
  const toRad = (deg) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** 0.0123 → "12 m", 1.84 → "1.8 km" */
export const formatDistance = (km) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`)
