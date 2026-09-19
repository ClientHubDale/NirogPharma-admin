/** Google Maps configuration, from .env (see .env.example for where to get the key). */
export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
export const GOOGLE_MAPS_MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID'
export const hasGoogleMapsKey = Boolean(GOOGLE_MAPS_API_KEY)

/** Initial view: the Malwa / Nimar region around Indore. */
export const DEFAULT_MAP_CENTER = { lat: 22.72, lng: 75.86 }
export const DEFAULT_MAP_ZOOM = 8

/** A location ping newer than this counts as "live". */
export const LIVE_WINDOW_MINUTES = 30
