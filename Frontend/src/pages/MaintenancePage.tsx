import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { getAllIssues } from '../api/issueReportApi'
import type { ApiIssue } from '../api/issueReportApi'
import {
  createMaintenanceTask,
  getAllMaintenanceTasks,
  getAllParts,
  updateMaintenanceTask,
  updateMaintenanceTaskStatus,
} from '../api/maintenanceTaskApi'
import type { ApiMaintenanceTask, PartItem, TaskPartUsage } from '../api/maintenanceTaskApi'
import { Field, MachineOptions, MachineReference, Notice, Options, ScrollTable } from '../components/EquipmentUi'
import { activeMachines, formatDay, isOutstanding, isOverdue, localDay, validDay } from '../frontendData'
import { taskStatuses } from '../models'
import type { LinkedMachine, TaskStatus } from '../models'

const DB_USERS = [
  { id: 1, name: 'Standard User (Operator)' },
  { id: 2, name: 'Admin User (Supervisor)' },
]

type Props = {
  machines: LinkedMachine[]
  currentUserId: number
  canManage?: boolean
  today: string
}

const transitions: Record<TaskStatus, [label: string, status: TaskStatus][]> = {
  Scheduled: [['Start', 'In Progress'], ['Complete', 'Completed'], ['Cancel task', 'Cancelled']],
  'In Progress': [['Complete', 'Completed'], ['Cancel task', 'Cancelled']],
  Completed: [['Reopen', 'Scheduled']],
  Cancelled: [['Reopen', 'Scheduled']],
}

function TechnicianOptions() {
  return (
    <>
      <option value="">Unassigned</option>
      {DB_USERS.map(({ id, name }) => (
        <option value={id} key={id}>
          {name}
        </option>
      ))}
    </>
  )
}

function parseTechnicianId(form: FormData) {
  const raw = form.get('technician')
  if (!raw) return null
  const parsed = Number(raw)
  return DB_USERS.some((u) => u.id === parsed) ? parsed : null
}

export default function MaintenancePage({ machines, currentUserId, canManage = true, today }: Props) {
  const [tasks, setTasks] = useState<ApiMaintenanceTask[]>([])
  const [issues, setIssues] = useState<ApiIssue[]>([])
  const [partsCatalog, setPartsCatalog] = useState<PartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null)

  const [filter, setFilter] = useState('All')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [selectedMachineId, setSelectedMachineId] = useState<string>('')

  const [editingId, setEditingId] = useState<string>()
  const [editMachineId, setEditMachineId] = useState<string>('')
  const [draftParts, setDraftParts] = useState<TaskPartUsage[]>([])
  const [selectedPartId, setSelectedPartId] = useState<string>('')
  const [selectedPartQty, setSelectedPartQty] = useState<number>(1)

  const choices = activeMachines(machines)

  const scheduled = tasks.filter((t) => t.status === 'Scheduled').length
  const inProgress = tasks.filter((t) => t.status === 'In Progress').length
  const completed = tasks.filter((t) => t.status === 'Completed').length
  const overdue = tasks.filter((t) => isOverdue(t, today)).length

  async function refreshData() {
    const [fetchedTasks, fetchedIssues, fetchedParts] = await Promise.all([
      getAllMaintenanceTasks(),
      getAllIssues(),
      getAllParts(),
    ])
    setTasks(fetchedTasks)
    setIssues(fetchedIssues)
    setPartsCatalog(fetchedParts)
  }

  useEffect(() => {
    let ignore = false

    async function load() {
      try {
        setLoading(true)
        const [fetchedTasks, fetchedIssues, fetchedParts] = await Promise.all([
          getAllMaintenanceTasks(),
          getAllIssues(),
          getAllParts(),
        ])
        if (!ignore) {
          setTasks(fetchedTasks)
          setIssues(fetchedIssues)
          setPartsCatalog(fetchedParts)
        }
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Could not load maintenance data.')
        }
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    load()
    return () => {
      ignore = true
    }
  }, [])

  const machineOpenIssues = issues.filter(
    (issue) =>
      issue.status !== 'Resolved' &&
      (!selectedMachineId || issue.machineId === Number(selectedMachineId))
  )

  const visible = tasks
    .filter((task) =>
      filter === 'Overdue' ? isOverdue(task, today) : filter === 'All' || task.status === filter
    )
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))

  function startEditing(task: ApiMaintenanceTask) {
    setError('')
    setNotice('')
    setEditingId(task.id)
    setEditMachineId(String(task.machineId))
    setDraftParts(task.partsUsed ? [...task.partsUsed] : [])
    setSelectedPartId('')
    setSelectedPartQty(1)
  }

  function addDraftPart() {
    const partId = Number(selectedPartId)
    if (!partId || selectedPartQty < 1) return

    const catalogItem = partsCatalog.find((p) => p.id === partId)
    setDraftParts((current) => {
      const existing = current.find((p) => p.partId === partId)
      if (existing) {
        return current.map((p) =>
          p.partId === partId ? { ...p, quantityUsed: p.quantityUsed + selectedPartQty } : p
        )
      }
      return [
        ...current,
        {
          partId,
          partNumber: catalogItem?.partNumber,
          partName: catalogItem?.partName,
          quantityUsed: selectedPartQty,
        },
      ]
    })
    setSelectedPartId('')
    setSelectedPartQty(1)
  }

  function removeDraftPart(partId: number) {
    setDraftParts((current) => current.filter((p) => p.partId !== partId))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canManage || submitting) return
    const form = event.currentTarget
    const values = new FormData(form)
    const machineId = Number(values.get('machine'))
    const rawIssueId = values.get('issueId')
    const issueId = rawIssueId ? Number(rawIssueId) : null
    const taskDescription = String(values.get('description') ?? '').trim()
    const dueDate = String(values.get('dueDate') ?? '')
    setNotice('')

    if (!choices.some((machine) => machine.id === machineId)) return setError('Select an active machine.')
    if (taskDescription.length < 5) return setError('Describe the work using at least 5 characters.')
    if (!validDay(dueDate) || dueDate < localDay()) return setError('Choose today or a future date.')

    setError('')
    setSubmitting(true)

    try {
      await createMaintenanceTask({
        machineId,
        issueId,
        assignedTechnicianId: parseTechnicianId(values),
        createdByUserId: currentUserId,
        taskDescription,
        dueAt: `${dueDate}T17:00:00`,
      })

      await refreshData()
      form.reset()
      setSelectedMachineId('')
      setNotice('Maintenance task scheduled.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule maintenance.')
    } finally {
      setSubmitting(false)
    }
  }

  async function saveRowEdit(event: FormEvent<HTMLFormElement>, task: ApiMaintenanceTask) {
    event.preventDefault()
    if (!canManage || busyTaskId) return

    const values = new FormData(event.currentTarget)
    const machineId = Number(values.get('machine'))
    const rawIssueId = values.get('issueId')
    const issueId = rawIssueId ? Number(rawIssueId) : null
    const dueDate = String(values.get('dueDate') ?? '')
    const taskDescription = String(values.get('description') ?? '').trim()
    const workPerformed = String(values.get('notes') ?? '').trim()
    const assignedTechnicianId = parseTechnicianId(values)

    if (!choices.some((m) => m.id === machineId)) return setError('Select an active machine.')
    if (taskDescription.length < 5) return setError('Task description must be at least 5 characters.')
    if (!validDay(dueDate)) return setError('Choose a valid due date.')

    setError('')
    setBusyTaskId(task.id)

    try {
      await updateMaintenanceTask(task.id, {
        machineId,
        issueId,
        assignedTechnicianId,
        lastUpdatedByUserId: currentUserId,
        taskDescription,
        dueAt: `${dueDate}T17:00:00`,
        workPerformed,
        partsUsed: draftParts.map((p) => ({ partId: p.partId, quantityUsed: p.quantityUsed })),
      })

      await refreshData()
      setEditingId(undefined)
      setNotice('Maintenance task updated.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save maintenance task.')
    } finally {
      setBusyTaskId(null)
    }
  }

  async function handleStatusTransition(task: ApiMaintenanceTask, nextStatus: TaskStatus) {
    if (!canManage || busyTaskId) return
    setError('')
    setNotice('')
    setBusyTaskId(task.id)

    try {
      await updateMaintenanceTaskStatus(task.id, nextStatus, currentUserId)
      await refreshData()
      setNotice(`Task updated to ${nextStatus}.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task status.')
    } finally {
      setBusyTaskId(null)
    }
  }

  function formatPartLabel(usage: TaskPartUsage) {
    if (usage.partName && usage.partNumber) {
      return `${usage.partName} (${usage.partNumber}) ×${usage.quantityUsed}`
    }
    const part = partsCatalog.find((p) => p.id === usage.partId)
    return part
      ? `${part.partName} (${part.partNumber}) ×${usage.quantityUsed}`
      : `Part #${usage.partId} ×${usage.quantityUsed}`
  }

  return (
    <div className="issues-layout">
      {canManage && (
        <section className="panel">
          <h3>Schedule maintenance</h3>
          {!choices.length && <p>Add or restore a machine in Administration to schedule maintenance.</p>}
          <form className="issue-form" onSubmit={submit}>
            <div className="issue-form-row">
              <Field label="Machine">
                <select
                  name="machine"
                  required
                  value={selectedMachineId}
                  onChange={(e) => setSelectedMachineId(e.target.value)}
                  disabled={!choices.length || submitting}
                >
                  <option value="">Select a machine</option>
                  <MachineOptions machines={choices} />
                </select>
              </Field>
              <Field label="Linked issue (optional)">
                <select name="issueId" defaultValue="" disabled={!machineOpenIssues.length || submitting}>
                  <option value="">
                    {machineOpenIssues.length ? 'None — preventive / standalone' : 'No open issues for machine'}
                  </option>
                  {machineOpenIssues.map((issue) => (
                    <option key={issue.id} value={issue.id}>
                      #{issue.id} · {issue.description.slice(0, 45)} ({issue.priority})
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="issue-form-row">
              <Field label="Due date">
                <input name="dueDate" type="date" min={today} max="9999-12-31" required disabled={submitting} />
              </Field>
              <Field label="Assigned technician">
                <select name="technician" disabled={submitting}>
                  <TechnicianOptions />
                </select>
              </Field>
            </div>
            <Field label="Work description">
              <textarea name="description" rows={3} minLength={5} maxLength={1000} required disabled={submitting} />
            </Field>
            {error && !editingId && <Notice message={error} error />}
            <button className="primary-button" type="submit" disabled={!choices.length || submitting}>
              {submitting ? 'Scheduling...' : 'Schedule maintenance'}
            </button>
          </form>
        </section>
      )}

      <section className="panel">
        <h3>Maintenance tasks</h3>
        <p>
          {scheduled} scheduled · {inProgress} in progress · {completed} completed · {overdue} overdue
        </p>
        <div className="equipment-toolbar">
          <Field label="Task status">
            <select value={filter} onChange={(event) => setFilter(event.target.value)}>
              <option value="All">All tasks</option>
              <Options values={taskStatuses} />
              <option>Overdue</option>
            </select>
          </Field>
        </div>
        <Notice message={notice} />
        {error && editingId && <Notice message={error} error />}
        <ScrollTable label="Maintenance tasks ordered by due date">
          <thead>
            <tr>
              <th scope="col">Machine</th>
              <th scope="col">Work &amp; Parts Used</th>
              <th scope="col">Technician</th>
              <th scope="col">Due date</th>
              <th scope="col">Status</th>
              {canManage && <th scope="col">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={canManage ? 6 : 5} className="empty-state">
                  Loading maintenance tasks...
                </td>
              </tr>
            )}
            {!loading && !visible.length && (
              <tr>
                <td colSpan={canManage ? 6 : 5} className="empty-state">
                  No maintenance tasks to show.
                </td>
              </tr>
            )}
            {!loading &&
              visible.map((task) => {
                const isEditing = canManage && editingId === task.id
                const editIssues = issues.filter(
                  (issue) =>
                    (issue.status !== 'Resolved' || Number(issue.id) === task.issueId) &&
                    issue.machineId === Number(editMachineId || task.machineId)
                )

                if (isEditing) {
                  return (
                    <tr key={task.id}>
                      <td colSpan={6}>
                        <form className="task-editor" onSubmit={(e) => saveRowEdit(e, task)}>
                          <div className="issue-form-row">
                            <Field label="Machine">
                              <select
                                name="machine"
                                value={editMachineId}
                                onChange={(e) => setEditMachineId(e.target.value)}
                                required
                                disabled={busyTaskId === task.id}
                              >
                                <MachineOptions machines={choices} />
                              </select>
                            </Field>
                            <Field label="Linked issue (optional)">
                              <select
                                name="issueId"
                                defaultValue={task.issueId ? String(task.issueId) : ''}
                                disabled={busyTaskId === task.id}
                              >
                                <option value="">None — standalone task</option>
                                {editIssues.map((issue) => (
                                  <option key={issue.id} value={issue.id}>
                                    #{issue.id} · {issue.description.slice(0, 45)} ({issue.status})
                                  </option>
                                ))}
                              </select>
                            </Field>
                            <Field label="Due date">
                              <input
                                name="dueDate"
                                type="date"
                                defaultValue={task.dueDate.slice(0, 10)}
                                max="9999-12-31"
                                required
                                disabled={busyTaskId === task.id}
                              />
                            </Field>
                            <Field label="Assigned technician">
                              <select
                                name="technician"
                                defaultValue={
                                  task.assignedTechnicianId !== null ? String(task.assignedTechnicianId) : ''
                                }
                                disabled={busyTaskId === task.id}
                              >
                                <TechnicianOptions />
                              </select>
                            </Field>
                          </div>

                          <div className="issue-form-row">
                            <Field label="Task description">
                              <textarea
                                name="description"
                                defaultValue={task.description}
                                rows={2}
                                minLength={5}
                                maxLength={1000}
                                required
                                disabled={busyTaskId === task.id}
                              />
                            </Field>
                            <Field label="Work performed">
                              <textarea
                                name="notes"
                                defaultValue={task.workPerformed}
                                rows={2}
                                maxLength={2000}
                                disabled={busyTaskId === task.id}
                              />
                            </Field>
                          </div>

                          <Field label="Parts used (MaintenanceTaskPart)">
                            <div className="action-row">
                              <select
                                value={selectedPartId}
                                onChange={(e) => setSelectedPartId(e.target.value)}
                                disabled={busyTaskId === task.id}
                              >
                                <option value="">Select part...</option>
                                {partsCatalog.map((part) => (
                                  <option key={part.id} value={part.id}>
                                    {part.partNumber} · {part.partName}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="number"
                                min={1}
                                max={99}
                                value={selectedPartQty}
                                onChange={(e) => setSelectedPartQty(Math.max(1, Number(e.target.value)))}
                                style={{ width: '4.5rem' }}
                                aria-label="Quantity used"
                                disabled={busyTaskId === task.id}
                              />
                              <button
                                type="button"
                                className="close-details"
                                onClick={addDraftPart}
                                disabled={busyTaskId === task.id}
                              >
                                Add part
                              </button>
                            </div>
                            {draftParts.length > 0 && (
                              <ul style={{ margin: '0.4rem 0 0', paddingLeft: '1.1rem' }}>
                                {draftParts.map((usage) => (
                                  <li key={usage.partId}>
                                    {formatPartLabel(usage)}{' '}
                                    <button
                                      type="button"
                                      className="close-details"
                                      onClick={() => removeDraftPart(usage.partId)}
                                      disabled={busyTaskId === task.id}
                                    >
                                      Remove
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </Field>

                          <div className="action-row">
                            <button type="submit" className="primary-button" disabled={busyTaskId === task.id}>
                              {busyTaskId === task.id ? 'Saving...' : 'Save changes'}
                            </button>
                            <button
                              type="button"
                              className="close-details"
                              disabled={busyTaskId === task.id}
                              onClick={() => {
                                setEditingId(undefined)
                                setError('')
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      </td>
                    </tr>
                  )
                }

                return (
                  <tr key={task.id}>
                    <td>
                      {task.machineName || (
                        <MachineReference
                          machine={machines.find((machine) => machine.id === task.machineId)}
                          id={task.machineId}
                        />
                      )}
                      {task.issueId && <small className="issue-area">Linked Issue #{task.issueId}</small>}
                    </td>
                    <td className="issue-description">
                      <div>{task.description}</div>
                      {task.workPerformed && (
                        <small className="issue-area">Work performed: {task.workPerformed}</small>
                      )}
                      {task.partsUsed && task.partsUsed.length > 0 && (
                        <small className="issue-area">
                          Parts used: {task.partsUsed.map(formatPartLabel).join(', ')}
                        </small>
                      )}
                    </td>
                    <td>
                      {task.assignedTechnicianName ??
                        DB_USERS.find(({ id }) => id === task.assignedTechnicianId)?.name ??
                        (task.assignedTechnicianId === null
                          ? 'Unassigned'
                          : `User #${task.assignedTechnicianId}`)}
                    </td>
                    <td>
                      <time dateTime={task.dueDate}>{formatDay(task.dueDate)}</time>
                    </td>
                    <td>
                      <span
                        className={`status-badge ${
                          isOutstanding(task)
                            ? 'status-maintenance'
                            : task.status === 'Completed'
                            ? 'status-operational'
                            : 'status-neutral'
                        }`}
                      >
                        {task.status}
                      </span>
                      {isOverdue(task, today) && (
                        <span className="status-badge status-down overdue-badge">Overdue</span>
                      )}
                      {task.completedAt && (
                        <small className="issue-area">
                          <time dateTime={task.completedAt}>
                            {new Date(task.completedAt).toLocaleString()}
                          </time>
                        </small>
                      )}
                    </td>
                    {canManage && (
                      <td>
                        <div className="action-row">
                          {transitions[task.status].map(([label, status]) => (
                            <button
                              type="button"
                              className="close-details"
                              key={status}
                              disabled={busyTaskId === task.id}
                              onClick={() => handleStatusTransition(task, status)}
                            >
                              {label}
                            </button>
                          ))}
                          <button
                            type="button"
                            className="close-details"
                            disabled={busyTaskId === task.id}
                            onClick={() => startEditing(task)}
                          >
                            Edit task
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
          </tbody>
        </ScrollTable>
      </section>
    </div>
  )
}