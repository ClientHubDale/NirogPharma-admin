/**
 * Settings the admin owns and the bill leans on: the bank the money goes to,
 * the terms printed under it, and whether the vehicle and e-way bill numbers
 * are asked for before a bill can go out.
 */
import api from './api'

export async function listSettings() {
  const { data } = await api.get('/settings')
  return data.data.settings
}

export async function saveSettings(group, patch) {
  const { data } = await api.patch(`/settings/${group}`, patch)
  return { group, settings: data.data.settings, message: data.message }
}

export function errorFrom(error) {
  const body = error?.response?.data
  return { message: body?.message ?? 'Could not reach the server.', details: body?.details, code: body?.code }
}
