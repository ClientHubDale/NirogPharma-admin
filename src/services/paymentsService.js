/**
 * Payment In: money received from a distributor, and what each firm owes.
 *
 * Recording a payment is not the same as having the money. A cheque is only
 * approved once it has cleared into the company's account, and **only an
 * approved payment moves what a distributor owes** — so a cheque that bounces
 * needs no undoing, it simply never got approved.
 */
import api from './api'

const query = (params = {}) => ({ params: Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null)) })

export async function listPayments(params = {}) {
  const { data } = await api.get('/payments', query(params))
  return { payments: data.data.payments, total: data.meta?.total ?? data.data.payments.length }
}

export async function getPayment(id) {
  const { data } = await api.get(`/payments/${id}`)
  return data.data.payment
}

/** What the next payment will be called, so the drawer can offer it. */
export async function nextPaymentNo(at) {
  const { data } = await api.get('/payments/next-number', query({ at }))
  return data.data.number
}

/**
 * The firm's bills with something still unpaid, plus their account.
 *
 * `exceptPaymentId` leaves the payment being edited out of the sums, so its
 * own allocations do not read back as money already spoken for.
 */
export async function duesFor(distributorId, exceptPaymentId) {
  const { data } = await api.get('/payments/dues', query({ distributorId, exceptPaymentId }))
  return data.data
}

/** Billed, credited, received and outstanding for every firm at once. */
export async function accounts() {
  const { data } = await api.get('/payments/accounts')
  return data.data.accounts
}

export async function createPayment(payload) {
  const { data } = await api.post('/payments', payload)
  return data.data.payment
}

export async function updatePayment(id, payload) {
  const { data } = await api.patch(`/payments/${id}`, payload)
  return data.data.payment
}

/** Approve or reject. The admin's decision, and the only thing that moves money. */
export async function setPaymentStatus(id, status) {
  const { data } = await api.patch(`/payments/${id}/status`, { status })
  return data.data.payment
}

export async function deletePayment(id) {
  await api.delete(`/payments/${id}`)
}

export function errorFrom(error) {
  const body = error?.response?.data
  return {
    message: body?.message ?? 'Something went wrong. Try again.',
    code: body?.code ?? null,
    details: body?.details ?? {},
  }
}
