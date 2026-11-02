/**
 * Credit notes: what we owe a distributor for stock they sent back. Raised by
 * the return itself, on their own number series.
 */
import api from './api'

const query = (params = {}) => ({ params: Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null)) })

export async function listCreditNotes(params = {}) {
  const { data } = await api.get('/credit-notes', query(params))
  return { notes: data.data.notes, total: data.meta?.total ?? data.data.notes.length }
}

/** One note with its lines, which is what the printed sheet needs. */
export async function getCreditNote(id) {
  const { data } = await api.get(`/credit-notes/${id}`)
  return data.data.note
}

/** What the next note will be called, so the return form can show it. */
export async function nextNoteNo(at) {
  const { data } = await api.get('/credit-notes/next-number', query({ at }))
  return data.data.noteNo
}

export async function createCreditNote(payload) {
  const { data } = await api.post('/credit-notes', payload)
  return data.data.note
}

export async function updateCreditNote(id, payload) {
  const { data } = await api.patch(`/credit-notes/${id}`, payload)
  return data.data.note
}

/** Issuing is what moves the stock, exactly as issuing a bill does. */
export async function issueCreditNote(id) {
  const { data } = await api.post(`/credit-notes/${id}/issue`)
  return data.data.note
}

/**
 * Takes a note back out again, with the return that raised it. The goods go
 * back onto the distributor's books, as if the return never happened.
 */
export async function cancelCreditNote(id) {
  const { data } = await api.delete(`/credit-notes/${id}`)
  return data.data
}

export function errorFrom(error) {
  const body = error?.response?.data
  return { message: body?.message ?? 'Could not reach the server.', details: body?.details, code: body?.code }
}
