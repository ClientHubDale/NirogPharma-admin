/**
 * Minimal CSV reader for Import (Excel files go through lib/xlsx.js).
 * Handles quoted fields, commas, quotes and newlines inside quotes.
 */

/** CSV string → array of objects keyed by the (trimmed, lower-cased) header row. */
export function parseCSV(text) {
  const rows = []
  let row = []
  let cell = ''
  let quoted = false
  const input = text.replace(/^﻿/, '')

  for (let i = 0; i < input.length; i++) {
    const ch = input[i]
    if (quoted) {
      if (ch === '"' && input[i + 1] === '"') {
        cell += '"'
        i++
      } else if (ch === '"') quoted = false
      else cell += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') {
      row.push(cell)
      cell = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && input[i + 1] === '\n') i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else cell += ch
  }
  if (cell || row.length) {
    row.push(cell)
    rows.push(row)
  }

  const [header = [], ...data] = rows.filter((r) => r.some((c) => c.trim() !== ''))
  const keys = header.map((h) => h.trim().toLowerCase())
  return data.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? '').trim()])))
}
