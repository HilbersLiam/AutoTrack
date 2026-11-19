import type { LinkedMachine, MachineStatus, MachineSystem, ProductionArea } from '../models'

export type ApiProductionArea = ProductionArea & {
  description: string
}

export type ApiMachineSystem = MachineSystem & {
  areaName: string
  description: string
}

export type ApiAdminMachine = LinkedMachine & {
  description: string
}

const API_BASE_URL = 'http://localhost:5091/api/Administration'

async function checkResponse(response: Response, fallbackMessage: string) {
  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `${fallbackMessage} (${response.status})`)
  }
}

export async function getAdminData(): Promise<{
  areas: ApiProductionArea[]
  systems: ApiMachineSystem[]
  machines: ApiAdminMachine[]
}> {
  const [areasRes, systemsRes, machinesRes] = await Promise.all([
    fetch(`${API_BASE_URL}/areas`),
    fetch(`${API_BASE_URL}/systems`),
    fetch(`${API_BASE_URL}/machines`),
  ])

  await checkResponse(areasRes, 'Failed to load production areas')
  await checkResponse(systemsRes, 'Failed to load machine systems')
  await checkResponse(machinesRes, 'Failed to load machines')

  const [rawAreas, rawSystems, rawMachines] = await Promise.all([
    areasRes.json(),
    systemsRes.json(),
    machinesRes.json(),
  ])

  const areas: ApiProductionArea[] = rawAreas.map((dto: any) => ({
    id: dto.areaId ?? dto.areaID,
    name: dto.areaName,
    description: dto.description ?? '',
  }))

  const systems: ApiMachineSystem[] = rawSystems.map((dto: any) => ({
    id: dto.systemId ?? dto.systemID,
    areaId: dto.areaId ?? dto.areaID,
    areaName: dto.areaName ?? '',
    name: dto.systemName,
    description: dto.description ?? '',
  }))

  const machines: ApiAdminMachine[] = rawMachines.map((dto: any) => ({
    id: dto.machineId ?? dto.machineID,
    systemId: dto.systemId ?? dto.systemID,
    systemName: dto.systemName ?? '',
    areaId: dto.areaId ?? dto.areaID,
    areaName: dto.areaName ?? '',
    name: dto.machineName,
    location: dto.location ?? '',
    description: dto.description ?? '',
    isArchived: Boolean(dto.isArchived),
    status: (dto.status ?? 'Operational') as MachineStatus,
  }))

  return { areas, systems, machines }
}

export async function createArea(payload: { areaName: string; description: string }) {
  const res = await fetch(`${API_BASE_URL}/areas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  await checkResponse(res, 'Failed to add production area')
}

export async function updateArea(areaId: number, payload: { areaName: string; description: string }) {
  const res = await fetch(`${API_BASE_URL}/areas/${areaId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  await checkResponse(res, 'Failed to update production area')
}

export async function createSystem(payload: { areaId: number; systemName: string; description: string }) {
  const res = await fetch(`${API_BASE_URL}/systems`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  await checkResponse(res, 'Failed to add machine system')
}

export async function updateSystem(
  systemId: number,
  payload: { areaId: number; systemName: string; description: string }
) {
  const res = await fetch(`${API_BASE_URL}/systems/${systemId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  await checkResponse(res, 'Failed to update machine system')
}

export async function createMachine(payload: {
  systemId: number
  machineName: string
  location: string
  description: string
  status: MachineStatus
  changedByUserId: number
}) {
  const res = await fetch(`${API_BASE_URL}/machines`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  await checkResponse(res, 'Failed to add machine')
}

export async function updateMachine(
  machineId: number,
  payload: {
    systemId: number
    machineName: string
    location: string
    description: string
    isArchived: boolean
    status: MachineStatus
    changedByUserId: number
  }
) {
  const res = await fetch(`${API_BASE_URL}/machines/${machineId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  await checkResponse(res, 'Failed to update machine')
}

export async function setMachineArchived(machineId: number, isArchived: boolean) {
  const res = await fetch(`${API_BASE_URL}/machines/${machineId}/archive`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isArchived }),
  })
  await checkResponse(res, 'Failed to update archive status')
}