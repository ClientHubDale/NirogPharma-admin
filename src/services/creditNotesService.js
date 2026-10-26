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

/** What the next note will be called, so the return form can show it. */
export async function nextNoteNo(at) {
  const { data } = await api.get('/credit-notes/next-number', query({ at }))
  return data.data.noteNo
}

export function errorFrom(error) {
  const body = error?.response?.data
  return { message: body?.message ?? 'Could not reach the server.', details: body?.details, code: body?.code }
}
