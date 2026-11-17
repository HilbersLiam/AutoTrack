import { demoAreas } from './demoData.ts'
import { isOption, issueStatuses, machineStatuses, priorities, taskStatuses } from './models.ts'
import type { DemoData, Issue, IssueStatus, LinkedMachine, Machine, MaintenanceTask, TaskStatus } from './models.ts'

export const dataKey = 'autotrack-demo-v2'
const legacyKeys = {
  areas: 'autotrack-production-areas-v1',
  statuses: 'autotrack-machine-statuses-v1',
  issues: 'autotrack-issues-v1',
  tasks: 'autotrack-maintenance-v1',
}

type StorageAccess = Pick<Storage, 'getItem' | 'setItem'>
type Row = Record<string, unknown>

function record(value: unknown): Row | undefined {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Row
}

function validId(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
}

function validName(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function timestamp(value: unknown): string | null {
  return typeof value === 'string' && Number.isFinite(Date.parse(value)) ? value : null
}

export function localDay(date = new Date()) {
  return [
    String(date.getFullYear()).padStart(4, '0'),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

export function validDay(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    value >= '0001-01-01' && localDay(new Date(value + 'T12:00:00')) === value
}

export function formatDay(value: string) {
  return new Date(value + 'T12:00:00').toLocaleDateString()
}

function readIssue(row: Row): Issue | undefined {
  const { id, machineId, description, priority, status } = row
  const createdAt = timestamp(row.createdAt)
  if (validName(id) && validId(machineId) && validName(description) && createdAt &&
    isOption(priorities, priority) && isOption(issueStatuses, status)) {
    return { id, machineId, description, priority, status, createdAt,
      resolvedAt: status === 'Resolved' ? timestamp(row.resolvedAt) : null }
  }
}

function readTask(row: Row): MaintenanceTask | undefined {
  const { id, machineId, description, dueDate, status } = row
  if (validName(id) && validId(machineId) && validName(description) && validDay(dueDate) &&
    isOption(taskStatuses, status)) {
    return { id, machineId, description, dueDate, status,
      createdAt: timestamp(row.createdAt),
      completedAt: status === 'Completed' ? timestamp(row.completedAt) : null,
      workPerformed: typeof row.workPerformed === 'string' ? row.workPerformed : '',
      assignedTechnicianId: validId(row.assignedTechnicianId) ? row.assignedTechnicianId : null }
  }
}

function readArea({ id, name }: Row) {
  if (validId(id) && validName(name)) return { id, name }
}

function readMachine(row: Row, systemId: number, fallbackStatus?: unknown): Machine | undefined {
  const { id, name, location, isArchived } = row
  if (!validId(id) || !validName(name)) return
  const status = isOption(machineStatuses, row.status) ? row.status : fallbackStatus
  return { id, name, systemId, location: typeof location === 'string' ? location : '',
    isArchived: isArchived === true || isArchived === 1,
    status: isOption(machineStatuses, status) ? status : 'Operational' }
}

export function loadDemo(storage: StorageAccess) {
  let warning = ''
  let original: string | null = null
  let canSave = true

  function read(key: string): unknown {
    let raw: string | null
    try {
      raw = storage.getItem(key)
      if (key === dataKey) original = raw
    } catch {
      warning = 'Browser storage is unavailable. Changes cannot be saved.'
      canSave = false
      return null
    }

    try {
      return raw === null ? null : JSON.parse(raw)
    } catch {
      flagInvalid()
      return null
    }
  }

  function flagInvalid() {
    if (canSave) warning = 'Some saved demo data could not be read. Valid records are shown.'
  }

  function rows<T extends { id: number | string }>(
    value: unknown, decode: (row: Row) => T | undefined,
  ): T[] {
    if (!Array.isArray(value)) {
      flagInvalid()
      return []
    }

    const ids = new Set<number | string>()
    const result: T[] = []
    for (const item of value) {
      const row = record(item)
      const decoded = row && decode(row)
      if (!decoded || ids.has(decoded.id)) {
        flagInvalid()
        continue
      }
      ids.add(decoded.id)
      result.push(decoded)
    }
    return result
  }

  const current = record(read(dataKey))
  let data: DemoData
  if (current?.version === 2) {
    const areas = rows(current.areas, readArea)
    const areaIds = new Set(areas.map((area) => area.id))
    const systems = rows(current.systems, ({ id, name, areaId }) => {
      if (validId(id) && validName(name) && validId(areaId) && areaIds.has(areaId)) {
        return { id, name, areaId }
      }
    })
    const systemIds = new Set(systems.map((system) => system.id))
    const machines = rows(current.machines, (row) => {
      if (validId(row.systemId) && systemIds.has(row.systemId)) return readMachine(row, row.systemId)
    })
    data = { areas, systems, machines, issues: rows(current.issues, readIssue), tasks: rows(current.tasks, readTask) }
    if (warning) {
      canSave = false
      warning += ' Saving is disabled to protect the original snapshot.'
    }
  } else {
    if (original !== null) {
      canSave = false
      warning = 'The saved demo version could not be loaded. Saving is disabled to protect it.'
    }

    const rawAreas = read(legacyKeys.areas)
    const rawStatuses = read(legacyKeys.statuses)
    const statuses = record(rawStatuses)
    if (rawAreas !== null && !Array.isArray(rawAreas)) flagInvalid()
    if (rawStatuses !== null && !statuses) flagInvalid()
    const legacyAreas = rows(Array.isArray(rawAreas) ? rawAreas : demoAreas, (row) => {
      const area = readArea(row)
      if (area) return { ...area, machines: row.machines }
    })
    const areas = legacyAreas.map(({ id, name }) => ({ id, name }))
    const systems = areas.map(({ id }) => ({ id, areaId: id, name: 'Default system' }))
    const machines = rows(legacyAreas.flatMap(({ id, machines }) =>
      rows(machines, (row) => {
        const legacyStatus = validId(row.id) ? statuses?.[String(row.id)] : undefined
        // The area editor stored status inline. The original seed used a separate status map.
        const candidate = Array.isArray(rawAreas) ? row : { ...row, status: legacyStatus ?? row.status }
        return readMachine(candidate, id, legacyStatus)
      })), (row) => {
        if (validId(row.systemId)) return readMachine(row, row.systemId)
      })
    const issues = rows(read(legacyKeys.issues) ?? [], readIssue)
    const tasks = rows(read(legacyKeys.tasks) ?? [], readTask)
    data = { areas, systems, machines, issues, tasks }
  }

  function save(next: DemoData) {
    if (!canSave) return false
    try {
      if (storage.getItem(dataKey) !== original) return false
      const raw = JSON.stringify({ version: 2, ...next })
      storage.setItem(dataKey, raw)
      original = raw
      return true
    } catch {
      return false
    }
  }

  const initialSaveFailed = original === null && canSave && !save(data)
  return { data, warning, initialSaveFailed, save }
}

export function linkedMachines({ areas, systems, machines }: DemoData): LinkedMachine[] {
  const areasById = new Map(areas.map((area) => [area.id, area]))
  const systemsById = new Map(systems.map((system) => [system.id, system]))
  return machines.flatMap((machine) => {
    const system = systemsById.get(machine.systemId)
    const area = system && areasById.get(system.areaId)
    return system && area
      ? [{ ...machine, systemName: system.name, areaId: area.id, areaName: area.name }]
      : []
  })
}

export function activeMachines<T extends Machine>(machines: T[]) {
  return machines.filter((machine) => !machine.isArchived)
}

export function nextId(ids: number[]) {
  const used = new Set(ids)
  const highest = ids.reduce((max, id) => Math.max(max, id), 0)
  if (highest < Number.MAX_SAFE_INTEGER) return highest + 1
  let available = 1
  while (used.has(available)) available += 1
  return available
}

export function newWorkId(records: { id: string }[]) {
  // Legacy UUIDs remain valid; numeric demo IDs also work over plain HTTP.
  return String(nextId(records.map(({ id }) => Number(id)).filter(validId)))
}

export function upsert<T extends { id: number | string }>(records: T[], record: T) {
  return records.some(({ id }) => id === record.id)
    ? records.map((item) => item.id === record.id ? record : item)
    : [...records, record]
}

export function changeIssueStatus(issue: Issue, status: IssueStatus, now = new Date()): Issue {
  return { ...issue, status, resolvedAt: status === 'Resolved' ? now.toISOString() : null }
}

export function changeTaskStatus(task: MaintenanceTask, status: TaskStatus, now = new Date()): MaintenanceTask {
  return { ...task, status, completedAt: status === 'Completed' ? now.toISOString() : null }
}

export function isOutstanding(task: MaintenanceTask) {
  return task.status === 'Scheduled' || task.status === 'In Progress'
}

export function isOverdue(task: MaintenanceTask, today: string) {
  return isOutstanding(task) && task.dueDate < today
}

export function reportCounts(data: Pick<DemoData, 'machines' | 'issues' | 'tasks'>, today: string) {
  const machines = activeMachines(data.machines)
  const operational = machines.filter(({ status }) => status === 'Operational').length
  const unresolved = data.issues.filter(({ status }) => status !== 'Resolved')
  return {
    machines: machines.length,
    operational,
    percentage: machines.length ? Math.round(operational / machines.length * 100) : null,
    down: machines.filter(({ status }) => status === 'Down').length,
    underMaintenance: machines.filter(({ status }) => status === 'Under Maintenance').length,
    unresolved: unresolved.length,
    highPriority: unresolved.filter(({ priority }) => priority === 'High').length,
    scheduled: data.tasks.filter(({ status }) => status === 'Scheduled').length,
    inProgress: data.tasks.filter(({ status }) => status === 'In Progress').length,
    outstanding: data.tasks.filter(isOutstanding).length,
    completed: data.tasks.filter(({ status }) => status === 'Completed').length,
    overdue: data.tasks.filter((task) => isOverdue(task, today)).length,
  }
}

export function reportBreakdown(data: DemoData, today: string) {
  function countGroup(machines: Machine[]) {
    const ids = new Set(machines.map(({ id }) => id))
    return reportCounts({
      machines,
      issues: data.issues.filter(({ machineId }) => ids.has(machineId)),
      tasks: data.tasks.filter(({ machineId }) => ids.has(machineId)),
    }, today)
  }

  return data.areas.flatMap((area) => {
    const systems = data.systems.filter(({ areaId }) => areaId === area.id)
    const systemIds = new Set(systems.map(({ id }) => id))
    const machines = data.machines.filter(({ systemId }) => systemIds.has(systemId))
    return [
      { key: `area-${area.id}`, name: area.name, isSystem: false, counts: countGroup(machines) },
      ...systems.map((system) => ({
        key: `system-${system.id}`,
        name: system.name,
        isSystem: true,
        counts: countGroup(machines.filter(({ systemId }) => systemId === system.id)),
      })),
    ]
  })
}
