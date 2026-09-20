import { createSlice } from '@reduxjs/toolkit'
import { INITIAL_ATTENDANCE } from '@/mocks/attendance'

/**
 * Daily attendance from the mobile app. The office window it is measured
 * against lives in settingsSlice (Settings › Company › Office working hours).
 */
const attendanceSlice = createSlice({
  name: 'attendance',
  initialState: { records: INITIAL_ATTENDANCE },
  reducers: {},
})

export const selectAttendance = (state) => state.attendance.records
export default attendanceSlice.reducer
