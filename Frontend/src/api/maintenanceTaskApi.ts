import type { TaskStatus } from '../models'

export interface PartItem {
  id: number
  partNumber: string
  partName: string
  description: string
}

export interface TaskPartUsage {
  partId: number
  partNumber?: string
  partName?: string
  quantityUsed: number
}

export interface ApiMaintenanceTask {
  id: string
  machineId: number
  machineName?: string
  issueId: number | null
  assignedTechnicianId: number | null
  assignedTechnicianName?: string | null
  createdByUserId: number
  lastUpdatedByUserId: number
  description: string
  status: TaskStatus
  createdAt: string
  dueDate: string
  completedAt: string | null
  workPerformed: string
  partsUsed: TaskPartUsage[]
}

export interface CreateMaintenanceTaskPayload {
  machineId: number
  issueId: number | null
  assignedTechnicianId: number | null
  createdByUserId: number
  taskDescription: string
  dueAt: string
}

export interface UpdateMaintenanceTaskPayload {
  machineId: number
  issueId: number | null
  assignedTechnicianId: number | null
  lastUpdatedByUserId: number
  taskDescription: string
  dueAt: string
  workPerformed: string
  partsUsed: { partId: number; quantityUsed: number }[]
}

const TASK_API_URL = 'http://localhost:5091/api/MaintenanceTask'
const PART_API_URL = 'http://localhost:5091/api/Part'

export async function getAllMaintenanceTasks(): Promise<ApiMaintenanceTask[]> {
  const response = await fetch(TASK_API_URL)
  if (!response.ok) throw new Error(`Failed to load maintenance tasks (${response.status})`)

  const raw = await response.json()
  return raw.map((dto: any): ApiMaintenanceTask => ({
    id: String(dto.taskId ?? dto.taskID),
    machineId: dto.machineId ?? dto.machineID,
    machineName: dto.machineName,
    issueId: dto.issueId ?? dto.issueID ?? null,
    assignedTechnicianId: dto.assignedTechnicianId ?? dto.assignedTechnicianID ?? null,
    assignedTechnicianName: dto.assignedTechnicianName ?? null,
    createdByUserId: dto.createdByUserId ?? dto.createdByUserID,
    lastUpdatedByUserId: dto.lastUpdatedByUserId ?? dto.lastUpdatedByUserID,
    description: dto.taskDescription,
    status: dto.taskStatus,
    createdAt: dto.createdAt,
    dueDate: String(dto.dueAt).slice(0, 10),
    completedAt: dto.completedAt ?? null,
    workPerformed: dto.workPerformed ?? '',
    partsUsed: (dto.partsUsed ?? []).map((p: any) => ({
      partId: p.partId ?? p.partID,
      partNumber: p.partNumber,
      partName: p.partName,
      quantityUsed: p.quantityUsed,
    })),
  }))
}

export async function getAllParts(): Promise<PartItem[]> {
  const response = await fetch(PART_API_URL)
  if (!response.ok) throw new Error(`Failed to load parts (${response.status})`)

  const raw = await response.json()
  return raw.map((dto: any): PartItem => ({
    id: dto.partId ?? dto.partID,
    partNumber: dto.partNumber,
    partName: dto.partName,
    description: dto.description ?? '',
  }))
}

export async function createMaintenanceTask(payload: CreateMaintenanceTaskPayload): Promise<void> {
  const response = await fetch(TASK_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) throw new Error(`Failed to schedule maintenance (${response.status})`)
}

export async function updateMaintenanceTask(
  taskId: string,
  payload: UpdateMaintenanceTaskPayload
): Promise<void> {
  const response = await fetch(`${TASK_API_URL}/${taskId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) throw new Error(`Failed to update maintenance task (${response.status})`)
}

export async function updateMaintenanceTaskStatus(
  taskId: string,
  taskStatus: TaskStatus,
  lastUpdatedByUserId: number
): Promise<void> {
  const response = await fetch(`${TASK_API_URL}/${taskId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ taskStatus, lastUpdatedByUserId }),
  })
  if (!response.ok) throw new Error(`Failed to update task status (${response.status})`)
}