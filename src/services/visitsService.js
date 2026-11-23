/** Who called on which firm, and who nobody reached. */
import api from './api'

const query = (params = {}) => ({
  params: Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null)),
})

/**
 * Visits down a manager's firms for a stretch of days. Comes back with the
 * firms that were visited and, kept apart, the ones that were not.
 */
export async function report(params = {}) {
  const { data } = await api.get('/visits', query(params))
  return data.data
}

/** How many times each firm was called on, for the Parties column. */
export async function counts(params = {}) {
  const { data } = await api.get('/visits/counts', query(params))
  return data.data
}

export async function record(body = {}) {
  const { data } = await api.post('/visits', body)
  return data.data.visit
}

export { errorFrom } from './usersService'
