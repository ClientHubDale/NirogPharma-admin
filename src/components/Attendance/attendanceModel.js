/**
 * Attendance rules. "Office time" is the window a day is measured against:
 * checking in after the start is late, and working less than the window is a
 * partial day.
 */
export const toMinutes = (hhmm) => {
  if (!hhmm) return null
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export const workedMinutes = (record) => {
  const start = toMinutes(record?.inAt)
  const end = toMinutes(record?.outAt)
  return start != null && end != null ? Math.max(0, end - start) : null
}

export const officeMinutes = (officeTime) => Math.max(0, toMinutes(officeTime.end) - toMinutes(officeTime.start))

export const isLate = (record, officeTime) => toMinutes(record?.inAt) > toMinutes(officeTime.start)

/** Checked out, but worked less than the office window. */
export const isPartial = (record, officeTime) => {
  const worked = workedMinutes(record)
  return worked != null && worked < officeMinutes(officeTime)
}

/** 699 → "11hr 39m" (as on the reference screens) */
export function formatWorkedHours(minutes) {
  if (minutes == null) return '-- : --'
  return `${Math.floor(minutes / 60)}hr ${minutes % 60}m`
}

/** Totals behind the cards at the top of both attendance screens. */
export function attendanceStats(records, officeTime, activeCount) {
  const present = records.length
  return {
    present,
    absent: Math.max(0, activeCount - present),
    late: records.filter((r) => isLate(r, officeTime)).length,
    partial: records.filter((r) => isPartial(r, officeTime)).length,
    active: activeCount,
  }
}
