/**
 * Giveaways — a pen, a bag. Given away with a scheme but never made or sold,
 * so they are kept apart from the catalogue and nothing is deducted from stock.
 */
import api from './api'

export async function listGifts() {
  const { data } = await api.get('/gifts')
  return data.data.gifts
}

export async function createGift({ name, unit }) {
  const { data } = await api.post('/gifts', { name, unit })
  return { gift: data.data.gift, message: data.message }
}

export async function deleteGift(id) {
  const { data } = await api.delete(`/gifts/${id}`)
  return data.message
}

export { errorFrom } from './usersService'
