/**
 * App users: roles, the create/edit form and its rules. Login is mobile +
 * password for every role (there is no self-signup), so the mobile number is
 * the unique key.
 */
export const USER_ROLES = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'EXECUTIVE', label: 'Sales Executive' },
]
export const ROLE_LABEL = Object.fromEntries(USER_ROLES.map((r) => [r.value, r.label]))

/**
 * Access lists use an explicit "All …" entry (as in the client's reference).
 * `['ALL']` and an empty list both mean "everything at that level".
 */
export const ALL_ACCESS = 'ALL'
export const isAllAccess = (value) => !value.length || value.includes(ALL_ACCESS)
export const withAllOption = (label, options) => [{ value: ALL_ACCESS, label }, ...options]
/** Picking "All …" drops the individual choices, and vice versa. */
export const pickAccess = (next) => (next.at(-1) === ALL_ACCESS ? [ALL_ACCESS] : next.filter((v) => v !== ALL_ACCESS))

export const USER_STATUSES = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
]

export const emptyUserForm = () => ({
  name: '',
  mobile: '',
  role: '',
  email: '',
  password: '',
  confirmPassword: '',
  designation: '',
  reportingTo: '',
  status: 'ACTIVE',
  regionIds: [],
  cityIds: [],
  routeIds: [],
  categories: [],
  brands: [],
  photo: [], // optional profile picture
  // What User › Payouts works out this person's monthly bill from.
  salary: '',
  taPerKm: '',
  daPerDay: '',
  incentivePercent: '',
})

export const userToForm = (user) => ({
  ...emptyUserForm(),
  ...user,
  password: '',
  confirmPassword: '',
})

export const formToUser = (form, id) => ({
  id,
  name: form.name.trim(),
  mobile: form.mobile.trim(),
  email: form.email.trim(),
  role: form.role,
  designation: form.designation.trim(),
  reportingTo: form.reportingTo,
  status: form.status,
  regionIds: form.regionIds,
  cityIds: form.cityIds,
  routeIds: form.routeIds,
  categories: form.categories,
  brands: form.brands,
  photo: form.photo,
  salary: Number(form.salary) || 0,
  taPerKm: Number(form.taPerKm) || 0,
  daPerDay: Number(form.daPerDay) || 0,
  incentivePercent: Number(form.incentivePercent) || 0,
})

/** Returns { field: message } — empty = valid. */
export function validateUserForm(form, { users, editingId }) {
  const e = {}
  if (!form.name.trim()) e.name = 'Enter a name.'
  if (!form.mobile.trim()) e.mobile = 'Enter a mobile number.'
  else if (!/^[6-9]\d{9}$/.test(form.mobile.trim())) e.mobile = 'Enter a 10-digit Indian mobile number.'
  else if (users.some((u) => u.id !== editingId && u.mobile === form.mobile.trim())) e.mobile = 'Another user already signs in with this number.'
  if (!form.role) e.role = 'Choose a role.'
  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Enter a valid email address.'
  // Editing keeps the current password unless a new one is typed.
  const needsPassword = !editingId || form.password || form.confirmPassword
  if (needsPassword) {
    if (!form.password) e.password = 'Enter a password.'
    else if (form.password.length < 6) e.password = 'Use at least 6 characters.'
    if (form.password !== form.confirmPassword) e.confirmPassword = 'The two passwords do not match.'
  }
  if (form.reportingTo && form.reportingTo === editingId) e.reportingTo = 'A user cannot report to themselves.'
  // Payout rates
  for (const [field, label] of [['salary', 'Salary'], ['taPerKm', 'TA per km'], ['daPerDay', 'DA per day']]) {
    if (form[field] !== '' && !(Number(form[field]) >= 0)) e[field] = `${label} cannot be negative.`
  }
  if (form.incentivePercent !== '' && !(Number(form.incentivePercent) >= 0 && Number(form.incentivePercent) <= 100))
    e.incentivePercent = 'Incentive is a percentage between 0 and 100.'
  return e
}

export const USER_SHEET_COLUMNS = [
  { key: 'name', header: 'Name', width: 26, required: true },
  { key: 'mobile', header: 'Mobile', width: 14, required: true },
  { key: 'role', header: 'Role', width: 16, required: true },
  { key: 'email', header: 'Email', width: 28 },
  { key: 'designation', header: 'Designation', width: 22 },
  { key: 'reportingTo', header: 'Reporting To', width: 24 },
  { key: 'status', header: 'Status', width: 12 },
]

export const USER_SAMPLE_ROWS = [
  { name: 'Ramesh Verma', mobile: '9876543210', role: 'Sales Executive', email: '', designation: 'Sales Executive', reportingTo: 'Sunil Deshmukh', status: 'Active' },
  { name: 'Kavita Joshi', mobile: '9876543211', role: 'Manager', email: 'kavita@nirogpharma.in', designation: 'Area Sales Manager', reportingTo: '', status: 'Active' },
]

export const USER_IMPORT_REQUIRED = 'Name, Mobile (10 digits, not already used) and Role. Imported users get the password nirog@123 and must change it at first login.'

/** Sheet rows → users, with a reason for every row that could not be used. */
export function rowsToUsers(rows, users) {
  const added = []
  const skipped = []
  rows.forEach((raw, i) => {
    const line = i + 2
    const name = String(raw.name ?? '').trim()
    const mobile = String(raw.mobile ?? '').replace(/\D/g, '')
    const roleText = String(raw.role ?? '').trim().toLowerCase()
    if (!name) return skipped.push({ line, reason: 'missing Name' })
    if (!/^[6-9]\d{9}$/.test(mobile)) return skipped.push({ line, reason: `bad Mobile "${raw.mobile ?? ''}"` })
    if ([...users, ...added].some((u) => u.mobile === mobile)) return skipped.push({ line, reason: `mobile ${mobile} already used` })
    const role = USER_ROLES.find((r) => r.label.toLowerCase() === roleText || r.value.toLowerCase() === roleText)
    if (!role) return skipped.push({ line, reason: `unknown Role "${raw.role ?? ''}"` })
    const reportingTo = users.find((u) => u.name.toLowerCase() === String(raw.reportingTo ?? '').trim().toLowerCase())?.id ?? ''
    added.push({
      id: `usr-${Date.now()}-${i}`,
      name,
      mobile,
      email: String(raw.email ?? '').trim(),
      role: role.value,
      designation: String(raw.designation ?? '').trim(),
      reportingTo,
      status: String(raw.status ?? '').trim().toLowerCase() === 'inactive' ? 'INACTIVE' : 'ACTIVE',
      regionIds: [],
      cityIds: [],
      routeIds: [],
      categories: [],
      brands: [],
      photo: [],
    })
  })
  return { added, skipped }
}
