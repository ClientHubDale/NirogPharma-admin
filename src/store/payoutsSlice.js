import { createSlice } from '@reduxjs/toolkit'

/**
 * Staff payouts, keyed `${userId}:${month}`. Only what the admin decides is
 * stored — corrections, adjustments and the status. Every figure is worked out
 * from attendance and sales at render time (components/Users/Payouts/payoutModel).
 */
const payoutsSlice = createSlice({
  name: 'payouts',
  initialState: { byId: {} },
  reducers: {
    payoutSaved(state, { payload: { payout } }) {
      state.byId[payout.id] = payout
    },
    payoutPatched(state, { payload: { id, changes } }) {
      state.byId[id] = { ...state.byId[id], ...changes }
    },
  },
})

export const { payoutSaved, payoutPatched } = payoutsSlice.actions
export const selectPayouts = (state) => state.payouts.byId
export default payoutsSlice.reducer
