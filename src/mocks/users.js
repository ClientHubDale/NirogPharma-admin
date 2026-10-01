/**
 * MOCK DATA (UI phase) — app users (Admin, Manager, Sales Executive).
 * Backend replacement: GET /users → same shape (never the password).
 * Field staff here are the same people as Live Location and Attendance.
 */
import { fieldStaff } from './liveLocation'

const MANAGER_BY_SHORT = { 'S. Deshmukh': 'u14', 'P. Naidu': 'u4', 'A. Rathi': 'u9' }

export const INITIAL_USERS = [
  {
    id: 'admin',
    name: 'Office Admin',
    mobile: '9876500001',
    email: 'admin@nirogpharma.in',
    role: 'ADMIN',
    reportingTo: '',
    status: 'ACTIVE',
    regionIds: [],
    cityIds: [],
    routeIds: [],
    salary: 45000,
    target: 0,
    taPerKm: 0,
    daPerDay: 0,
    incentivePercent: 0,
  },
  ...fieldStaff.map((user, i) => ({
    id: user.id,
    name: user.name,
    mobile: `9${String(149041318 + i * 7310711).slice(0, 9)}`,
    email: i % 3 === 0 ? `${user.name.split(' ')[0].toLowerCase()}@nirogpharma.in` : '',
    role: user.role === 'MANAGER' ? 'MANAGER' : 'EXECUTIVE',
    reportingTo: MANAGER_BY_SHORT[user.manager] ?? '',
    status: i === 10 || i === 16 ? 'INACTIVE' : 'ACTIVE',
    regionIds: [],
    cityIds: [],
    routeIds: [],
    // Payout rates — managers are on a higher salary, executives earn more incentive.
    salary: user.role === 'MANAGER' ? 32000 : 18000 + (i % 4) * 500,
    // Monthly sales target the incentive is measured against.
    target: user.role === 'MANAGER' ? 900000 : 300000 + (i % 5) * 50000,
    taPerKm: 4.5,
    daPerDay: user.role === 'MANAGER' ? 200 : 150,
    incentivePercent: user.role === 'MANAGER' ? 1 : 2,
  })),
]
