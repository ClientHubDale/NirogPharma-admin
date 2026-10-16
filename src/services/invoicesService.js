/**
 * Sales invoices against the API. The bill is priced on the server from the
 * distributor's own rate column — the panel never sends a rate.
 */
import api from './api'

const query = (params = {}) => ({ params: Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null)) })

export async function listInvoices(params = {}) {
  const { data } = await api.get('/invoices', query({ limit: 100, ...params }))
  return { invoices: data.data.invoices, total: data.meta?.total ?? data.data.invoices.length }
}

export async function getInvoice(id) {
  const { data } = await api.get(`/invoices/${id}`)
  return data.data.invoice
}

export async function createInvoice(form) {
  const { data } = await api.post('/invoices', form)
  return { invoice: data.data.invoice, message: data.message }
}

export async function updateInvoice(id, form) {
  const { data } = await api.patch(`/invoices/${id}`, form)
  return { invoice: data.data.invoice, message: data.message }
}

export async function issueInvoice(id) {
  const { data } = await api.post(`/invoices/${id}/issue`)
  return { invoice: data.data.invoice, message: data.message }
}

export async function setInvoiceStatus(id, status) {
  const { data } = await api.patch(`/invoices/${id}/status`, { status })
  return { invoice: data.data.invoice, message: data.message }
}

export async function deleteInvoice(id) {
  const { data } = await api.delete(`/invoices/${id}`)
  return data.message
}

export { errorFrom } from './usersService'
