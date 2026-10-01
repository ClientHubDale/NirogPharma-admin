/**
 * User › Users against the API. The shapes here are the ones the screen
 * already used while it ran on mock data, so nothing in the table, the form or
 * userModel.js had to change.
 */
import api from './api'

/** Fields the API takes; anything else on the form stays in the browser. */
const FIELDS = [
  'name',
  'mobile',
  'email',
  'role',
  'status',
  'reportingTo',
  'salary',
  'target',
  'taPerKm',
  'daPerDay',
  'incentivePercent',
]
const LIST_FIELDS = ['regionIds', 'cityIds', 'routeIds']

/**
 * A new photo is a File (that is what ImageUploader keeps), which has to go as
 * multipart. Without one, plain JSON is simpler to read in the network tab.
 */
function bodyFor(form) {
  const file = form.photo?.find((image) => image.file)?.file
  const fields = Object.fromEntries(FIELDS.filter((key) => form[key] !== undefined).map((key) => [key, form[key] ?? '']))
  const lists = Object.fromEntries(LIST_FIELDS.map((key) => [key, form[key] ?? []]))
  // An empty password on an edit means "keep the current one".
  if (form.password) fields.password = form.password

  if (!file) return { data: { ...fields, ...lists } }

  const data = new FormData()
  for (const [key, value] of Object.entries(fields)) data.append(key, value)
  for (const [key, value] of Object.entries(lists)) data.append(key, JSON.stringify(value))
  data.append('photo', file, file.name)
  // Let the browser set the multipart boundary itself.
  return { data, headers: { 'Content-Type': undefined } }
}

export async function listUsers(params = {}) {
  const { data } = await api.get('/users', { params: { limit: 100, ...params } })
  return { users: data.data.users, meta: data.meta }
}

export async function createUser(form) {
  const { data: body, headers } = bodyFor(form)
  const { data } = await api.post('/users', body, { headers })
  return { user: data.data.user, message: data.message, warning: data.data.warning }
}

export async function updateUser(id, form) {
  const { data: body, headers } = bodyFor(form)
  const { data } = await api.patch(`/users/${id}`, body, { headers })
  return { user: data.data.user, message: data.message, warning: data.data.warning }
}

export async function setUserStatus(id, isActive) {
  const { data } = await api.patch(`/users/${id}/status`, { isActive })
  return { user: data.data.user, message: data.message }
}

export async function importUsers(users) {
  const { data } = await api.post('/users/import', { users })
  return { ...data.data, message: data.message }
}

export async function deleteUser(id) {
  const { data } = await api.delete(`/users/${id}`)
  return data.message
}

/** The API's message, with its per-field details where it sent them. */
export function errorFrom(error) {
  const body = error.response?.data
  return {
    message: body?.message ?? 'Could not reach the server. Check your connection and try again.',
    details: body?.details ?? null,
    code: body?.code ?? 'UNKNOWN',
  }
}
