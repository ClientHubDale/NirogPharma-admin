/**
 * Giveaways — a pen, a bag. Given away with a scheme but never made or sold,
 * so they are kept apart from the catalogue and nothing is deducted from stock.
 */
import api from './api'

export async function listGifts() {
  const { data } = await api.get('/gifts')
  return data.data.gifts
}

/** A new picture is a File (what ImageUploader keeps), which needs multipart. */
export async function createGift({ name, unit, image }) {
  const file = image?.find((picture) => picture.file)?.file

  let body = { name, unit }
  let headers
  if (file) {
    body = new FormData()
    body.append('name', name)
    body.append('unit', unit)
    body.append('image', file, file.name)
    headers = { 'Content-Type': undefined }
  }

  const { data } = await api.post('/gifts', body, { headers })
  return { gift: data.data.gift, warning: data.data.warning, message: data.message }
}

export async function deleteGift(id) {
  const { data } = await api.delete(`/gifts/${id}`)
  return data.message
}

export { errorFrom } from './usersService'
