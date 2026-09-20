/**
 * MOCK DATA (UI phase) — app users (Admin, Manager, Sales Executive).
 * Backend replacement: GET /users → same shape (never the password).
 * Field staff here are the same people as Live Location and Attendance.
 */
import { INITIAL_BRANDS, INITIAL_CATEGORIES } from './items'
import { fieldStaff } from './liveLocation'

const MANAGER_BY_SHORT = { 'S. Deshmukh': 'u14', 'P. Naidu': 'u4', 'A. Rathi': 'u9' }

export const INITIAL_USERS = [
  {
    id: 'admin',
    name: 'Office Admin',
    mobile: '9876500001',
    email: 'admin@nirogpharma.in',
    role: 'ADMIN',
    designation: 'Administrator',
    reportingTo: '',
    status: 'ACTIVE',
    regionIds: [],
    cityIds: [],
    routeIds: [],
    categories: [],
    brands: [],
  },
  ...fieldStaff.map((user, i) => ({
    id: user.id,
    name: user.name,
    mobile: `9${String(149041318 + i * 7310711).slice(0, 9)}`,
    email: i % 3 === 0 ? `${user.name.split(' ')[0].toLowerCase()}@nirogpharma.in` : '',
    role: user.role === 'MANAGER' ? 'MANAGER' : 'EXECUTIVE',
    designation: user.role === 'MANAGER' ? 'Area Sales Manager' : 'Sales Executive',
    reportingTo: MANAGER_BY_SHORT[user.manager] ?? '',
    status: i === 10 || i === 16 ? 'INACTIVE' : 'ACTIVE',
    regionIds: [],
    cityIds: [],
    routeIds: [],
    // Everyone sells the full range for now; access is narrowed per user later.
    categories: i % 4 === 0 ? INITIAL_CATEGORIES.slice(0, 3) : [],
    brands: i % 5 === 0 ? [INITIAL_BRANDS[0]] : [],
  })),
]
