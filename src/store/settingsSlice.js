import { createSlice } from '@reduxjs/toolkit'
import { createAsyncThunk } from '@reduxjs/toolkit'
import { company as companyConstant } from '@/constants/site'
import * as settingsService from '@/services/settingsService'

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
  // What a bill must carry before it can be issued, and the terms printed on
  // it. The server owns these — the invoice screen reads them on every load.
  invoice: { vehicleNoRequired: false, ewayBillRequired: false, ewayBillThreshold: 50000, terms: '' },
  status: 'idle',
  error: null,
  mobileApp: {
    mandatoryAttendance: true,
    // Screens the field app locks until the user has checked in.
    mandatoryModules: ['PARTIES', 'ITEMS', 'TRANSACTIONS', 'DISTRIBUTORS', 'DELIVERIES', 'EXPENSES', 'LEADS'],
    photoAtCheckIn: false,
    trackOdometer: false,
    requireOdometer: false,
    // Salary in the field app: who may see their own payout bill.
    showSalary: true,
    salaryVisibleTo: ['ALL'],
    salaryPerDayTracking: true, // day-by-day working, not just the month's total
  },
}

export const fetchSettings = createAsyncThunk('settings/fetch', async (_, { rejectWithValue }) => {
  try {
    return await settingsService.listSettings()
  } catch (error) {
    return rejectWithValue(settingsService.errorFrom(error))
  }
})

export const saveSettingsGroup = createAsyncThunk('settings/save', async ({ group, patch }, { rejectWithValue }) => {
  try {
    return await settingsService.saveSettings(group, patch)
  } catch (error) {
    return rejectWithValue(settingsService.errorFrom(error))
  }
})

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
  extraReducers: (builder) => {
    builder
      .addCase(fetchSettings.pending, (state) => {
        state.status = 'loading'
      })
      // Only the groups the server owns are replaced; the rest of this screen
      // is still local, so a load must not wipe it.
      .addCase(fetchSettings.fulfilled, (state, { payload }) => {
        state.status = 'ready'
        state.error = null
        if (payload.bank) state.bank = { ...state.bank, ...payload.bank }
        if (payload.invoice) state.invoice = { ...state.invoice, ...payload.invoice }
      })
      .addCase(fetchSettings.rejected, (state, { payload }) => {
        state.status = 'failed'
        state.error = payload?.message ?? 'Could not load settings.'
      })
      .addCase(saveSettingsGroup.fulfilled, (state, { payload }) => {
        state[payload.group] = { ...state[payload.group], ...payload.settings }
      })
  },
})

export const { companySaved, mobileAppSaved } = settingsSlice.actions
export const selectCompany = (state) => state.settings.company
export const selectOffice = (state) => state.settings.office
export const selectBank = (state) => state.settings.bank
export const selectMobileApp = (state) => state.settings.mobileApp
/** What a bill must carry, and the terms printed under it. */
export const selectInvoiceSettings = (state) => state.settings.invoice
/** Attendance reads the office window from here. */
export const selectOfficeTime = (state) => state.settings.office
export default settingsSlice.reducer
