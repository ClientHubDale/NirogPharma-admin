/**
 * Sales orders against the API. Priced on the server from the customer's own
 * rate column, exactly as a bill is — the panel never sends a rate.
 */
import api from './api'

const query = (params = {}) => ({ params: Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null)) })

export async function listOrders(params = {}) {
  const { data } = await api.get('/orders', query({ limit: 100, ...params }))
  return { orders: data.data.orders, total: data.meta?.total ?? data.data.orders.length }
}

export async function getOrder(id) {
  const { data } = await api.get(`/orders/${id}`)
  return data.data.order
}

/** The next order number, so nobody has to invent one. */
export async function nextOrderNo() {
  const { data } = await api.get('/orders/next-number')
  return data.data.number
}

export async function createOrder(form) {
  const { data } = await api.post('/orders', form)
  return { order: data.data.order, message: data.message }
}

export async function updateOrder(id, form) {
  const { data } = await api.patch(`/orders/${id}`, form)
  return { order: data.data.order, message: data.message }
}

export async function setOrderStatus(id, status) {
  const { data } = await api.patch(`/orders/${id}/status`, { status })
  return { order: data.data.order, message: data.message }
}

/**
 * The order becomes a bill. The bill comes back a draft — its batches are
 * picked on the invoice screen, and issuing it is what moves the stock.
 */
export async function convertToInvoice(id, body) {
  const { data } = await api.post(`/orders/${id}/invoice`, body)
  return { order: data.data.order, invoice: data.data.invoice, message: data.message }
}

export async function deleteOrder(id) {
  const { data } = await api.delete(`/orders/${id}`)
  return data.message
}

export { errorFrom } from './usersService'
