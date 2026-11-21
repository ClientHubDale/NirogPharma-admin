/**
 * Schemes: what a distributor has to do to earn something, and what they get.
 *
 * One list, whichever door a scheme came in by — the Schemes screen or the
 * little box on an item's own form. The server keeps them in one table, so
 * nothing here has to merge two sources.
 */
import api from './api'

const query = (params = {}) => ({ params: Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null)) })

export async function listSchemes(params = {}) {
  const { data } = await api.get('/schemes', query(params))
  return { schemes: data.data.schemes, total: data.meta?.total ?? data.data.schemes.length }
}

export async function getScheme(id) {
  const { data } = await api.get(`/schemes/${id}`)
  return data.data.scheme
}

export async function createScheme(payload) {
  const { data } = await api.post('/schemes', payload)
  return data.data.scheme
}

export async function updateScheme(id, payload) {
  const { data } = await api.patch(`/schemes/${id}`, payload)
  return data.data.scheme
}

export async function setSchemeStatus(id, status) {
  const { data } = await api.patch(`/schemes/${id}/status`, { status })
  return data.data.scheme
}

export async function deleteScheme(id) {
  await api.delete(`/schemes/${id}`)
}

/**
 * What a document would earn, without writing anything.
 *
 * The order screen asks before the executive decides, so he can be shown the
 * offer and still say no — "एग्जीक्यूटिव स्कीम दे भी सकता है, नहीं भी दे सकता".
 */
export async function previewSchemes({ lines, at, only, lots } = {}) {
  // `only` and `lots` are the admin's decision — which schemes to hand over
  // and how many lots of each. Dropping them here would make the answer a
  // guess about a bill nobody is writing.
  const { data } = await api.post('/schemes/preview', { lines, at, only, lots })
  return data.data
}

export function errorFrom(error) {
  const body = error?.response?.data
  return {
    message: body?.message ?? 'Something went wrong. Try again.',
    code: body?.code ?? null,
    details: body?.details ?? {},
  }
}
