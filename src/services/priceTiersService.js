/**
 * The rate columns against the API. Four are seeded and locked; the rest are
 * the admin's, added from the item form's Tier prices block.
 */
import api from './api'

export async function fetchPriceTiers() {
  const { data } = await api.get('/price-tiers')
  return data.data.tiers
}

export async function createPriceTier({ discounts, label }) {
  const { data } = await api.post('/price-tiers', { discounts, label })
  return { tier: data.data.tier, priced: data.data.priced, message: data.message }
}

export async function updatePriceTier(id, changes) {
  const { data } = await api.patch(`/price-tiers/${id}`, changes)
  return { tier: data.data.tier, message: data.message }
}

export async function deletePriceTier(id) {
  const { data } = await api.delete(`/price-tiers/${id}`)
  return data.message
}

export { errorFrom } from './usersService'
