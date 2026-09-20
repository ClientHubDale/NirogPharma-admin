import { createSlice } from '@reduxjs/toolkit'
import { DEFAULT_DOC_SETTINGS, DOC_TYPES } from '@/components/Transactions/docTypes'
import { INITIAL_SALES_DOCS } from '@/mocks/salesDocs'

/**
 * Sales and purchase documents keyed by type ('ESTIMATE', 'SALES_ORDER', … see docTypes) plus
 * each type's Transaction Settings. Every action carries `type`.
 */
const transactionsSlice = createSlice({
  name: 'transactions',
  initialState: {
    docs: INITIAL_SALES_DOCS,
    settings: Object.fromEntries(Object.keys(DOC_TYPES).map((type) => [type, DEFAULT_DOC_SETTINGS])),
  },
  reducers: {
    docSaved(state, { payload: { type, doc } }) {
      const list = (state.docs[type] ??= [])
      const i = list.findIndex((d) => d.id === doc.id)
      if (i === -1) list.unshift(doc)
      else list[i] = doc
    },
    docPatched(state, { payload: { type, id, changes } }) {
      const d = state.docs[type].find((x) => x.id === id)
      if (d) Object.assign(d, changes)
    },
    docDeleted(state, { payload: { type, id } }) {
      state.docs[type] = state.docs[type].filter((d) => d.id !== id)
    },
    docRestored(state, { payload: { type, doc, index } }) {
      state.docs[type].splice(Math.min(index, state.docs[type].length), 0, doc)
    },
    settingsSaved(state, { payload: { type, settings } }) {
      state.settings[type] = settings
    },
  },
})

export const { docSaved, docPatched, docDeleted, docRestored, settingsSaved } = transactionsSlice.actions

const docSel = {}
const setSel = {}
export const selectDocs = (type) => (docSel[type] ??= (state) => state.transactions.docs[type] ?? EMPTY)
export const selectDocSettings = (type) => (setSel[type] ??= (state) => state.transactions.settings[type] ?? DEFAULT_DOC_SETTINGS)
const EMPTY = []

export default transactionsSlice.reducer
