import { createSlice } from '@reduxjs/toolkit'
import { INITIAL_PAYMENTS } from '@/mocks/payments'

/** Payments keyed by type: 'IN' (from customers) and 'OUT' (to suppliers). */
const paymentsSlice = createSlice({
  name: 'payments',
  initialState: { list: INITIAL_PAYMENTS },
  reducers: {
    paymentSaved(state, { payload: { payment } }) {
      const i = state.list.findIndex((p) => p.id === payment.id)
      if (i === -1) state.list.unshift(payment)
      else state.list[i] = payment
    },
    paymentPatched(state, { payload: { id, changes } }) {
      const p = state.list.find((x) => x.id === id)
      if (p) Object.assign(p, changes)
    },
    paymentDeleted(state, { payload: { id } }) {
      state.list = state.list.filter((p) => p.id !== id)
    },
    paymentRestored(state, { payload: { payment, index } }) {
      state.list.splice(Math.min(index, state.list.length), 0, payment)
    },
  },
})

export const { paymentSaved, paymentPatched, paymentDeleted, paymentRestored } = paymentsSlice.actions

const sel = {}
export const selectPayments = (type) => (sel[type] ??= (state) => state.payments.list.filter((p) => p.type === type))
export const selectAllPayments = (state) => state.payments.list

export default paymentsSlice.reducer
