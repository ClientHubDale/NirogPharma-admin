/**
 * Nudges about bills gone unpaid.
 *
 * The office reads the overdue list and decides what the firms hear; the
 * automatic nudges to the manager and the executive are raised by the server
 * when this list is asked for, so there is nothing to trigger from here.
 */
import api from './api'

const query = (params = {}) => ({
  params: Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null)),
})

/** The bills past thirty days, with the figures the card leads with. */
export async function overdue(params = {}) {
  const { data } = await api.get('/reminders/overdue', query(params))
  return data.data
}

/** Tick the bills, press Send — the only way a firm ever hears from us. */
export async function sendToDistributors(invoiceIds = []) {
  const { data } = await api.post('/reminders/send', { invoiceIds })
  return data.data
}

/** What the office has already told which firm. */
export async function sent(params = {}) {
  const { data } = await api.get('/reminders/sent', query(params))
  return data.data.reminders ?? []
}

/** The nudges addressed to whoever is signed in. */
export async function mine(params = {}) {
  const { data } = await api.get('/reminders/mine', query(params))
  return data.data
}

export async function markRead(ids = []) {
  const { data } = await api.post('/reminders/read', { ids })
  return data.data
}

export { errorFrom } from './usersService'
