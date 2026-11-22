/** Suppliers — the firms the factory buys from. */
import api from './api'

const query = (params = {}) => ({ params: Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null)) })

export async function listSuppliers(params = {}) {
  const { data } = await api.get('/suppliers', query({ limit: 200, ...params }))
  return { suppliers: data.data.suppliers, total: data.meta?.total ?? data.data.suppliers.length }
}

export async function createSupplier(form) {
  const { data } = await api.post('/suppliers', form)
  return { supplier: data.data.supplier, message: data.message }
}

export async function updateSupplier(id, form) {
  const { data } = await api.patch(`/suppliers/${id}`, form)
  return { supplier: data.data.supplier, message: data.message }
}

export async function deleteSupplier(id) {
  const { data } = await api.delete(`/suppliers/${id}`)
  return data.message
}

export { errorFrom } from './usersService'
