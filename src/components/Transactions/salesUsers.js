/** People who can create sales documents: the office admin + field staff. */
import { fieldStaff } from '@/mocks/liveLocation'

export const SALES_USERS = [{ id: 'admin', name: 'Office Admin' }, ...fieldStaff]
export const SALES_USERS_BY_ID = Object.fromEntries(SALES_USERS.map((u) => [u.id, u]))
export const SALES_USER_OPTIONS = SALES_USERS.map((u) => ({ value: u.id, label: u.name.toUpperCase() }))
