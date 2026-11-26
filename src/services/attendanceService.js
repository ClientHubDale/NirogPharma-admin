/** Who worked which day, and who did not turn up. */
import api from './api'

const query = (params = {}) => ({
  params: Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null)),
})

/**
 * Days across a stretch, in the shape the Attendance screens already render.
 *
 * Comes back with four things the screens need and used to invent for
 * themselves: `rows` (the days), `staff` (who was expected — the roster that
 * "absent" is counted against), `officeTime` (the window late and partial are
 * measured by) and `summary`.
 *
 * `from` and `to` are inclusive `YYYY-MM-DD`. Without them the API answers
 * for the last thirty days.
 */
export async function report(params = {}) {
  const { data } = await api.get('/attendance', query(params))
  return data.data
}

/** One day, for the main screen. */
export const day = (date, params = {}) => report({ from: date, to: date, ...params })

/** One person's month, for their own page. `month` is `YYYY-MM`. */
export function month(userId, monthKey) {
  const [year, m] = monthKey.split('-').map(Number)
  const last = new Date(Date.UTC(year, m, 0)).getUTCDate()
  return report({ userId, from: `${monthKey}-01`, to: `${monthKey}-${String(last).padStart(2, '0')}` })
}

/** A correction — the office's, and only the office's. */
export async function remove(id) {
  const { data } = await api.delete(`/attendance/${id}`)
  return data.data
}

export { errorFrom } from './usersService'

export default { report, day, month, remove }
