import { configureStore } from '@reduxjs/toolkit'
import authReducer from './authSlice'
import geographyReducer from './geographySlice'
import itemsReducer from './itemsSlice'
import partiesReducer from './partiesSlice'
import priceListsReducer from './priceListsSlice'
import attendanceReducer from './attendanceSlice'
import payoutsReducer from './payoutsSlice'
import settingsReducer from './settingsSlice'
import usersReducer from './usersSlice'
import paymentsReducer from './paymentsSlice'
import transactionsReducer from './transactionsSlice'
import schemesReducer from './schemesSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    items: itemsReducer,
    schemes: schemesReducer,
    priceLists: priceListsReducer,
    geography: geographyReducer,
    parties: partiesReducer,
    transactions: transactionsReducer,
    payments: paymentsReducer,
    attendance: attendanceReducer,
    users: usersReducer,
    settings: settingsReducer,
    payouts: payoutsReducer,
  },
  middleware: (getDefault) =>
    getDefault({
      // Item images hold browser File objects until they're uploaded (backend
      // phase), which Redux would otherwise flag as non-serializable.
      serializableCheck: {
        ignoredPaths: ['items.list', 'parties.CUSTOMER', 'parties.SUPPLIER', 'transactions.docs', 'payments.list', 'settings.company', 'settings.bank'],
        ignoredActions: ['items/itemsReplaced', 'parties/partySaved', 'parties/partyRestored', 'transactions/docSaved', 'transactions/docRestored', 'payments/paymentSaved', 'payments/paymentRestored'],
      },
    }),
})
