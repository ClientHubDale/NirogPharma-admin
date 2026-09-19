/**
 * Read palette colours from :root (index.css) outside React — for files we
 * generate (Excel), which need literal colour values. Keeps index.css the
 * single source of truth.
 */
export function cssColor(variable) {
  return getComputedStyle(document.documentElement).getPropertyValue(variable).trim()
}

/** "--green-deep" → "FF0E7C5A" (Excel ARGB). Handles #rgb and #rrggbb. */
export function excelColor(variable) {
  let hex = cssColor(variable).replace('#', '')
  if (hex.length === 3) hex = [...hex].map((c) => c + c).join('')
  return `FF${hex.toUpperCase()}`
}
