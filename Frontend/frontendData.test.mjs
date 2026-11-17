import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  activeMachines, changeIssueStatus, changeTaskStatus, dataKey, isOverdue,
  linkedMachines, loadDemo, nextId, reportBreakdown, reportCounts, validDay,
} from './src/frontendData.ts'

const createdAt = '2026-11-01T15:00:00.000Z'
const today = '2026-11-17'
const oldIssue = {
  id: 'issue-uuid', machineId: 31, description: 'Conveyor stalls',
  priority: 'High', status: 'Open', createdAt,
}
const oldTask = {
  id: 'task-uuid', machineId: 31, description: 'Inspect conveyor',
  dueDate: '2026-11-16', status: 'Scheduled',
}

function legacyStorage() {
  const backing = new Map(Object.entries({
    'autotrack-production-areas-v1': JSON.stringify([
      { id: 5, name: 'Renamed area', machines: [{ id: 31, name: 'Added conveyor', status: 'Down' }] },
      { id: 6, name: 'Empty area', machines: [] },
    ]),
    'autotrack-issues-v1': JSON.stringify([oldIssue, null]),
    'autotrack-maintenance-v1': JSON.stringify([oldTask, { ...oldTask, id: 'completed', status: 'Completed' }]),
  }))
  return {
    getItem: (key) => backing.get(key) ?? null,
    setItem: (key, value) => backing.set(key, value),
  }
}

test('migrates legacy hierarchy and both work record types, retaining IDs and legacy keys', () => {
  const storage = legacyStorage()
  const { data, warning } = loadDemo(storage)
  assert.match(warning, /some saved demo data/i)
  assert.deepEqual(data.areas.map(({ name }) => name), ['Renamed area', 'Empty area'])
  assert.deepEqual(data.systems.map(({ name }) => name), ['Default system', 'Default system'])
  assert.equal(data.machines[0].id, 31)
  assert.equal(data.machines[0].status, 'Down')
  assert.equal(data.issues[0].id, oldIssue.id)
  assert.equal(data.issues[0].machineId, 31)
  assert.equal(data.tasks[0].id, oldTask.id)
  assert.equal(data.tasks[0].machineId, 31)
  assert.equal(data.tasks[1].completedAt, null)
  assert.equal(JSON.parse(storage.getItem(dataKey)).version, 2)
  assert.ok(storage.getItem('autotrack-production-areas-v1'))
  assert.deepEqual(loadDemo(storage).data, data)
})

test('migrates status-only storage and respects an intentional empty area list', () => {
  const storage = legacyStorage()
  storage.setItem('autotrack-production-areas-v1', 'null')
  storage.setItem('autotrack-machine-statuses-v1', '{"1":"Down"}')
  assert.equal(loadDemo(storage).data.machines.find(({ id }) => id === 1).status, 'Down')
  const empty = legacyStorage()
  empty.setItem('autotrack-production-areas-v1', '[]')
  assert.deepEqual(loadDemo(empty).data.areas, [])
})

test('failed saves preserve legacy data and stale sessions cannot replace newer data', () => {
  const storage = legacyStorage()
  const failing = loadDemo({ ...storage, setItem() { throw Error('unavailable') } })
  assert.equal(failing.initialSaveFailed, true)
  assert.equal(failing.save(failing.data), false)
  assert.equal(storage.getItem(dataKey), null)
  assert.ok(storage.getItem('autotrack-maintenance-v1'))

  const first = loadDemo(storage)
  const second = loadDemo(storage)
  assert.equal(first.save({ ...first.data, issues: [] }), true)
  assert.equal(second.save(second.data), false)
  assert.deepEqual(loadDemo(storage).data.issues, [])
})

test('renaming, moving and archiving preserve links and report archived work separately from active equipment', () => {
  const store = loadDemo(legacyStorage())
  const data = store.data
  data.areas.push({ id: 7, name: 'No systems' })
  data.systems.push({ id: 9, areaId: 6, name: 'New system' })
  data.machines = [{ ...data.machines[0], name: 'Moved conveyor', systemId: 9, isArchived: true }]
  assert.equal(store.save(data), true)
  const [machine] = linkedMachines(data)
  assert.deepEqual([machine.id, machine.name, machine.areaName, machine.systemName],
    [31, 'Moved conveyor', 'Empty area', 'New system'])
  assert.deepEqual(activeMachines([machine]), [])
  assert.equal(activeMachines([{ ...machine, isArchived: false }]).length, 1)
  const rows = reportBreakdown(data, today)
  assert.equal(rows.find(({ key }) => key === 'system-9').counts.unresolved, 1)
  assert.equal(rows.find(({ key }) => key === 'area-6').counts.outstanding, 1)
  assert.equal(rows.find(({ key }) => key === 'area-6').counts.machines, 0)
  assert.equal(rows.find(({ key }) => key === 'area-5').counts.outstanding, 0)
  assert.equal(rows.find(({ key }) => key === 'area-7').counts.machines, 0)
  assert.equal(nextId([31, 77]), 78)
})

test('counts open and in-progress issues and only unfinished non-cancelled overdue tasks', () => {
  const data = loadDemo(legacyStorage()).data
  data.issues.push(
    changeIssueStatus({ ...data.issues[0], id: 'started-issue' }, 'In Progress'),
    changeIssueStatus({ ...data.issues[0], id: 'resolved-issue' }, 'Resolved'),
  )
  const task = data.tasks[0]
  const now = new Date('2026-11-17T15:00:00.000Z')
  const completed = changeTaskStatus(task, 'Completed', now)
  assert.equal(completed.completedAt, now.toISOString())
  assert.equal(changeTaskStatus(completed, 'Scheduled').completedAt, null)
  data.tasks.push(
    changeTaskStatus({ ...task, id: 'cancelled-task' }, 'Cancelled'),
    changeTaskStatus({ ...task, id: 'started-task' }, 'In Progress'),
    { ...task, id: 'due-today', dueDate: today },
  )
  assert.equal(isOverdue({ ...task, dueDate: today }, today), false)
  assert.equal(validDay('2026-02-29'), false)
  assert.equal(validDay('2028-02-29'), true)
  const counts = reportCounts(data, today)
  assert.deepEqual([counts.machines, counts.percentage, counts.unresolved, counts.highPriority], [1, 0, 2, 2])
  assert.deepEqual([counts.outstanding, counts.completed, counts.overdue], [3, 1, 2])
})

test('shows valid rows from a damaged version 2 snapshot and protects the raw data', () => {
  const storage = legacyStorage()
  const { data } = loadDemo(storage)
  const raw = JSON.stringify({ version: 2, ...data, systems: [...data.systems, { id: 999, areaId: 999, name: 'Orphan' }] })
  storage.setItem(dataKey, raw)
  const damaged = loadDemo(storage)
  assert.deepEqual(damaged.data, data)
  assert.match(damaged.warning, /saving is disabled/i)
  assert.equal(damaged.save(damaged.data), false)
  assert.equal(storage.getItem(dataKey), raw)
})
