import { configureStore } from '@reduxjs/toolkit'
import authReducer from './authSlice'
import itemsReducer from './itemsSlice'
import priceListsReducer from './priceListsSlice'
import schemesReducer from './schemesSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    items: itemsReducer,
    schemes: schemesReducer,
    priceLists: priceListsReducer,
  },
  middleware: (getDefault) =>
    getDefault({
      // Item images hold browser File objects until they're uploaded (backend
      // phase), which Redux would otherwise flag as non-serializable.
      serializableCheck: { ignoredPaths: ['items.list'], ignoredActions: ['items/itemsReplaced'] },
    }),
})
