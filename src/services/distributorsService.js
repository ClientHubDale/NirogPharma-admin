/**
 * Parties › Distributors against the API. Same shapes the screen renders, so
 * the table and form need no translation layer.
 */
import api from './api'

const FIELDS = [
  'name',
  'contactPerson',
  'mobile',
  'altMobile',
  'email',
  'address',
  'gstin',
  'drugLicence',
  'managerId',
  'regionId',
  'cityId',
  'areaId',
  'locationName',
  'latitude',
  'longitude',
  'creditLimit',
  'creditDays',
  'transport',
  'weeklyOff',
  'target',
  'status',
]

/** The two images are Files until they are uploaded — then it has to be multipart. */
function bodyFor(form) {
  const fields = Object.fromEntries(FIELDS.filter((key) => form[key] !== undefined).map((key) => [key, form[key] ?? '']))
  // The API keeps a list; this form assigns exactly one.
  const executiveIds = form.executiveId ? [form.executiveId] : []
  const files = [
    ['shopPhoto', form.shopPhoto?.find((image) => image.file)?.file],
    ['signature', form.signature?.find((image) => image.file)?.file],
  ].filter(([, file]) => file)

  if (!files.length) return { data: { ...fields, executiveIds } }

  const data = new FormData()
  for (const [key, value] of Object.entries(fields)) data.append(key, value)
  data.append('executiveIds', JSON.stringify(executiveIds))
  for (const [key, file] of files) data.append(key, file, file.name)
  return { data, headers: { 'Content-Type': undefined } }
}

export async function listDistributors(params = {}) {
  const { data } = await api.get('/distributors', { params: { limit: 100, ...params } })
  return { distributors: data.data.distributors, meta: data.meta }
}

export async function createDistributor(form) {
  const { data: body, headers } = bodyFor(form)
  const { data } = await api.post('/distributors', body, { headers })
  return { distributor: data.data.distributor, message: data.message, warning: data.data.warning }
}

export async function updateDistributor(id, form) {
  const { data: body, headers } = bodyFor(form)
  const { data } = await api.patch(`/distributors/${id}`, body, { headers })
  return { distributor: data.data.distributor, message: data.message, warning: data.data.warning }
}

export async function setDistributorStatus(id, isActive) {
  const { data } = await api.patch(`/distributors/${id}/status`, { isActive })
  return { distributor: data.data.distributor, message: data.message }
}

export async function deleteDistributor(id) {
  const { data } = await api.delete(`/distributors/${id}`)
  return data.message
}

export { errorFrom } from './usersService'
