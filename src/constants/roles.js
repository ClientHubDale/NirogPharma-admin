/** Every role in the system. Values match the backend `Role` enum. */
export const ROLES = {
  ADMIN: 'ADMIN',
  DISTRIBUTOR: 'DISTRIBUTOR',
  MANAGER: 'MANAGER',
  EXECUTIVE: 'EXECUTIVE',
}

/** Roles that sign in on this website. Managers and executives use the mobile app. */
export const WEB_ROLES = [ROLES.ADMIN, ROLES.DISTRIBUTOR]

export const ROLE_LABELS = {
  [ROLES.ADMIN]: 'Admin',
  [ROLES.DISTRIBUTOR]: 'Distributor',
  [ROLES.MANAGER]: 'Manager',
  [ROLES.EXECUTIVE]: 'Executive',
}

/** Where each web role lands after login. */
export const ROLE_HOME = {
  [ROLES.ADMIN]: '/admin',
  [ROLES.DISTRIBUTOR]: '/distributor',
}

export const homePathForRole = (role) => ROLE_HOME[role] ?? '/login'
