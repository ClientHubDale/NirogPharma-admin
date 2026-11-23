/** What the dashboard reads: sales by month, and sales by manager. */
import api from './api'

const query = (params = {}) => ({ params: Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null)) })

/** Six months back by default, newest first, each with its own total. */
export async function salesMonthly(params = {}) {
  const { data } = await api.get('/reports/sales-monthly', query(params))
  return data.data
}

/** Sales over a stretch of days — what the dropdown's "Custom" asks for. */
export async function salesBetween(from, to) {
  const { data } = await api.get('/reports/sales-monthly', query({ from, to }))
  return data.data.range
}

/** One month, grouped by the manager who owns the firm. */
export async function salesByManager(params = {}) {
  const { data } = await api.get('/reports/sales-by-manager', query(params))
  return data.data
}

export { errorFrom } from './usersService'
