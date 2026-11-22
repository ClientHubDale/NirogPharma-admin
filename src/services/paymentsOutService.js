/**
 * Money paid to suppliers. There is no purchase module, so nothing is settled
 * against a bill here — the supplier's own bill number travels as plain text.
 */
import api from './api'

const query = (params = {}) => ({ params: Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null)) })

export async function listPaymentsOut(params = {}) {
  const { data } = await api.get('/payments-out', query({ limit: 200, ...params }))
  return { payments: data.data.payments, total: data.meta?.total ?? data.data.payments.length }
}

/** The next voucher number, so nobody has to invent one. */
export async function nextPaymentOutNo() {
  const { data } = await api.get('/payments-out/next-number')
  return data.data.number
}

/** What each supplier has actually been paid — approved money only. */
export async function paidBySupplier() {
  const { data } = await api.get('/payments-out/paid')
  return data.data.suppliers
}

export async function createPaymentOut(form) {
  const { data } = await api.post('/payments-out', form)
  return { payment: data.data.payment, message: data.message }
}

export async function updatePaymentOut(id, form) {
  const { data } = await api.patch(`/payments-out/${id}`, form)
  return { payment: data.data.payment, message: data.message }
}

export async function setPaymentOutStatus(id, status) {
  const { data } = await api.patch(`/payments-out/${id}/status`, { status })
  return { payment: data.data.payment, message: data.message }
}

export async function deletePaymentOut(id) {
  const { data } = await api.delete(`/payments-out/${id}`)
  return data.message
}

export { errorFrom } from './usersService'
