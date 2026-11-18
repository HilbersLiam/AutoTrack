const rolePermissions = {
  Operator: ['reportIssue'],
  Technician: ['reportIssue'],
  Supervisor: ['reportIssue', 'administration', 'changeMachineStatus', 'manageIssues', 'manageMaintenance'],
} as const

export type Role = keyof typeof rolePermissions
export type Permission = typeof rolePermissions[Role][number]

export const demoRoles = {
  normal: 'Operator',
  admin: 'Supervisor',
} satisfies Record<string, Role>

export function can(role: unknown, permission: Permission): boolean {
  if (role === 'Operator' || role === 'Technician' || role === 'Supervisor') {
    return rolePermissions[role].some((allowed) => allowed === permission)
  }
  return false
}
