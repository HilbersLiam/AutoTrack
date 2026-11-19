export interface ApiStatusHistoryRecord {
  id: string
  machineId: number
  machineName: string
  areaName: string
  systemName: string
  changedByUserId: number
  changedByName: string
  status: string
  changedAt: string
}

const API_BASE_URL = 'http://localhost:5091/api/MachineStatusHistory'

export async function getAllStatusHistory(): Promise<ApiStatusHistoryRecord[]> {
  const response = await fetch(API_BASE_URL)
  if (!response.ok) {
    throw new Error(`Failed to load machine status history (${response.status})`)
  }

  const raw = await response.json()
  return raw.map((dto: any): ApiStatusHistoryRecord => ({
    id: String(dto.statusHistoryId ?? dto.statusHistoryID),
    machineId: dto.machineId ?? dto.machineID,
    machineName: dto.machineName ?? `Machine #${dto.machineId ?? dto.machineID}`,
    areaName: dto.areaName ?? '',
    systemName: dto.systemName ?? '',
    changedByUserId: dto.changedByUserId ?? dto.changedByUserID,
    changedByName: dto.changedByName ?? `User #${dto.changedByUserId ?? dto.changedByUserID}`,
    status: dto.status,
    changedAt: dto.changedAt,
  }))
}