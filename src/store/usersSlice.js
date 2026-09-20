import { createSlice } from '@reduxjs/toolkit'
import { INITIAL_USERS } from '@/mocks/users'

/** App users (Admin / Manager / Sales Executive) — the Users tab. */
const usersSlice = createSlice({
  name: 'users',
  initialState: { list: INITIAL_USERS },
  reducers: {
    userSaved(state, { payload: { user } }) {
      const i = state.list.findIndex((u) => u.id === user.id)
      if (i === -1) state.list.unshift(user)
      else state.list[i] = { ...state.list[i], ...user }
    },
    userPatched(state, { payload: { id, changes } }) {
      const u = state.list.find((x) => x.id === id)
      if (u) Object.assign(u, changes)
    },
    usersImported(state, { payload: { users } }) {
      state.list.unshift(...users)
    },
  },
})

export const { userSaved, userPatched, usersImported } = usersSlice.actions
export const selectUsers = (state) => state.users.list
export default usersSlice.reducer
