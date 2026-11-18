export const machineStatuses = ['Operational', 'Down', 'Under Maintenance'] as const
export const issueStatuses = ['Open', 'In Progress', 'Resolved'] as const
export const priorities = ['Low', 'Medium', 'High'] as const
export const taskStatuses = ['Scheduled', 'In Progress', 'Completed', 'Cancelled'] as const

export type MachineStatus = typeof machineStatuses[number]
export type IssueStatus = typeof issueStatuses[number]
export type Priority = typeof priorities[number]
export type TaskStatus = typeof taskStatuses[number]

export type ProductionArea = { id: number; name: string }
export type MachineSystem = { id: number; areaId: number; name: string }
export type Machine = {
  id: number
  systemId: number
  name: string
  location: string
  status: MachineStatus
  isArchived: boolean
}
export type LinkedMachine = Machine & { systemName: string; areaId: number; areaName: string }

export type Issue = {
  id: string
  machineId: number
  description: string
  priority: Priority
  status: IssueStatus
  createdAt: string
  resolvedAt: string | null
}

export type MaintenanceTask = {
  id: string
  machineId: number
  description: string
  dueDate: string
  status: TaskStatus
  createdAt: string | null
  completedAt: string | null
  workPerformed: string
  assignedTechnicianId: number | null
}

export type DemoData = {
  areas: ProductionArea[]
  systems: MachineSystem[]
  machines: Machine[]
  issues: Issue[]
  tasks: MaintenanceTask[]
}

export type LegacyArea = ProductionArea & {
  machines: (Pick<Machine, 'id' | 'name' | 'status'> & Partial<Pick<Machine, 'location' | 'isArchived'>>)[]
}

export type ChangeData = (update: (data: DemoData) => DemoData) => boolean

export function isOption<T extends string>(options: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && options.some((option) => option === value)
}
