/**
 * Stock against the API. Batches and the ledger behind them: what the factory
 * holds and what each distributor holds come from the same movements, so the
 * two screens can never disagree.
 */
import api from './api'

const query = (params = {}) => ({ params: Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null)) })

export async function listBatches(params = {}) {
  const { data } = await api.get('/stocks/batches', query(params))
  return { batches: data.data.batches, total: data.meta?.total ?? data.data.batches.length }
}

export async function createBatch(form) {
  const { data } = await api.post('/stocks/batches', form)
  return { batch: data.data.batch, message: data.message }
}

export async function updateBatch(id, form) {
  const { data } = await api.patch(`/stocks/batches/${id}`, form)
  return { batch: data.data.batch, message: data.message }
}

export async function deleteBatch(id) {
  const { data } = await api.delete(`/stocks/batches/${id}`)
  return data.message
}

export async function issueStock(body) {
  const { data } = await api.post('/stocks/issue', body)
  return { batches: data.data.batches, batch: data.data.batch, message: data.message }
}

/** The ledger behind one batch: every go, with its date and invoice number. */
export async function listBatchMovements(batchId) {
  const { data } = await api.get(`/stocks/batches/${batchId}/movements`)
  return data.data
}

export async function returnStock(body) {
  const { data } = await api.post('/stocks/return', body)
  return { batch: data.data.batch, message: data.message }
}

/** The admin's own figure for stock a distributor held before we started. */
export async function setDistributorOpening(body) {
  const { data } = await api.put('/stocks/distributors/opening', body)
  return { opening: data.data.opening, message: data.message }
}

export async function listDistributorStock(params = {}) {
  const { data } = await api.get('/stocks/distributors', query(params))
  return { rows: data.data.rows, total: data.meta?.total ?? data.data.rows.length }
}

export async function fetchSummary() {
  const { data } = await api.get('/stocks/summary')
  return data.data
}

export { errorFrom } from './usersService'
