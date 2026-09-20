import { createSlice } from '@reduxjs/toolkit'
import { company as companyConstant } from '@/constants/site'

/**
 * Company-wide settings (the Settings screen). The office window here is what
 * Attendance measures late check-ins and partial days against.
 */
const initialState = {
  company: {
    name: 'Nirog Pharma Private Limited',
    mobile: '9999972007',
    email: 'info@nirogpharma.co.in',
    address: '71 Anand Industrial Estate, Mohan Nagar, Ghaziabad 201007',
    stateCode: companyConstant.stateCode, // Uttar Pradesh
    gstin: '09AABCN9071E1ZD',
    type: 'DISTRIBUTOR',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    logo: [],
    signature: [],
  },
  office: {
    workingDays: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
    start: '08:00',
    end: '23:00',
    holidays: [],
  },
  bank: { accountNumber: '', accountHolder: '', bankName: '', branch: '', ifsc: '', qr: [] },
  mobileApp: {
    mandatoryAttendance: true,
    // Screens the field app locks until the user has checked in.
    mandatoryModules: ['PARTIES', 'ITEMS', 'TRANSACTIONS', 'DISTRIBUTORS', 'DELIVERIES', 'EXPENSES', 'LEADS'],
    photoAtCheckIn: false,
    trackOdometer: false,
    requireOdometer: false,
  },
}

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    companySaved(state, { payload }) {
      state.company = { ...state.company, ...payload.company }
      state.office = { ...state.office, ...payload.office }
      state.bank = { ...state.bank, ...payload.bank }
    },
    mobileAppSaved(state, { payload }) {
      state.mobileApp = { ...state.mobileApp, ...payload }
    },
  },
})

export const { companySaved, mobileAppSaved } = settingsSlice.actions
export const selectCompany = (state) => state.settings.company
export const selectOffice = (state) => state.settings.office
export const selectBank = (state) => state.settings.bank
export const selectMobileApp = (state) => state.settings.mobileApp
/** Attendance reads the office window from here. */
export const selectOfficeTime = (state) => state.settings.office
export default settingsSlice.reducer
