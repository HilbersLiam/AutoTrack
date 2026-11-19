import { isOption, machineStatuses } from '../models.ts'
import type { MachineStatus } from '../models.ts'

type LiveMachine = {
  id: number
  name: string
  status: MachineStatus | null
}

export type LiveEquipmentMachine = {
  id: number
  name: string
  areaName: string
  systemName: string
  location: string
  status: MachineStatus | null
}

type LiveSystem = {
  id: number | null
  name: string
  machines: LiveMachine[]
}

type LiveArea = {
  id: number
  name: string
  machineCount: number
  systems: LiveSystem[]
}

function isId(value: unknown): value is number {
  return typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value > 0
}

function isRow(value: unknown): value is Record<string, unknown> {
  return value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value)
}

export function parseLiveOverview(payload: unknown) {
  if (!Array.isArray(payload)) {
    throw new Error('Expected a list of production area rows.')
  }

  const rows: unknown[] = payload
  const areas = new Map<number, LiveArea>()
  const machineIds = new Set<number>()
  const machines: LiveEquipmentMachine[] = []

  const counts = {
    Operational: 0,
    Down: 0,
    'Under Maintenance': 0,
    Unknown: 0
  }

  for (const row of rows) {
    if (!isRow(row)) {
      throw new Error('Invalid production area row.')
    }

    const {
      areaID,
      areaName,
      systemID,
      systemName,
      machineID,
      machineName,
      currentStatus,
      location
    } = row

    if (!isId(areaID) || typeof areaName !== 'string' || !areaName.trim()) {
      throw new Error('Invalid production area ID or name.')
    }

    let area = areas.get(areaID)

    if (!area) {
      area = {
        id: areaID,
        name: areaName,
        machineCount: 0,
        systems: []
      }

      areas.set(areaID, area)
    }

    if (machineID === null) continue

    if (!isId(machineID) || typeof machineName !== 'string' || !machineName.trim()) {
      throw new Error('Invalid machine ID or name.')
    }

    if (machineIds.has(machineID)) continue

    const systemId = isId(systemID) ? systemID : null

    const name =
      typeof systemName === 'string' && systemName.trim()
        ? systemName
        : systemId !== null
          ? `System #${systemId}`
          : 'Machine system unavailable'

    let system = area.systems.find(
      system => system.id === systemId
    )

    if (!system) {
      system = {
        id: systemId,
        name,
        machines: []
      }

      area.systems.push(system)
    }

    const status = isOption(machineStatuses, currentStatus)
      ? currentStatus
      : null

    const machineLocation =
      typeof location === 'string' && location.trim()
        ? location.trim()
        : ''

    system.machines.push({
      id: machineID,
      name: machineName,
      status
    })

    machines.push({
      id: machineID,
      name: machineName,
      areaName,
      systemName: system.name,
      location: machineLocation,
      status
    })

    machineIds.add(machineID)
    area.machineCount++

    counts[status ?? 'Unknown']++
  }

  return {
    areas: [...areas.values()],
    machines,
    counts,
    machineCount: machineIds.size
  }
}