import { isOption, machineStatuses } from './models.ts'
import type { MachineStatus } from './models.ts'

type LiveMachine = { id: number; name: string; status: MachineStatus | null }
type LiveSystem = { id: number | null; name: string; machines: LiveMachine[] }
type LiveArea = { id: number; name: string; machineCount: number; systems: LiveSystem[] }

function isId(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
}

function isRow(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function parseLiveOverview(payload: unknown) {
  if (!Array.isArray(payload)) throw new Error('Expected a list of production area rows.')

  const rows: unknown[] = payload
  const areas = new Map<number, LiveArea>()
  const machineIds = new Set<number>()
  const counts = { Operational: 0, Down: 0, 'Under Maintenance': 0, Unknown: 0 }

  for (const row of rows) {
    if (!isRow(row)) throw new Error('Invalid production area row.')
    const { areaID, areaName, machineID, machineName, systemID, systemName, currentStatus } = row
    if (!isId(areaID) || typeof areaName !== 'string' || !areaName.trim()) {
      throw new Error('Invalid production area ID or name.')
    }

    let area = areas.get(areaID)
    if (!area) {
      area = { id: areaID, name: areaName, machineCount: 0, systems: [] }
      areas.set(areaID, area)
    }

    let machine: LiveMachine | undefined
    if (machineID !== null) {
      if (!isId(machineID) || typeof machineName !== 'string' || !machineName.trim()) {
        throw new Error('Invalid machine ID or name.')
      }
      if (machineIds.has(machineID)) continue
      const status = isOption(machineStatuses, currentStatus) ? currentStatus : null
      machine = { id: machineID, name: machineName, status }
    }

    const systemId = isId(systemID) ? systemID : null
    if (systemId === null && !machine) continue
    let system = area.systems.find(({ id }) => id === systemId)
    if (!system) {
      const name = systemId === null ? 'Machine system unavailable'
        : typeof systemName === 'string' && systemName.trim() ? systemName : `System #${systemId}`
      system = { id: systemId, name, machines: [] }
      area.systems.push(system)
    }

    if (!machine) continue
    machineIds.add(machine.id)
    system.machines.push(machine)
    area.machineCount++
    counts[machine.status ?? 'Unknown']++
  }

  return { areas: [...areas.values()], counts, machineCount: machineIds.size }
}
