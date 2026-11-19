import { useState } from 'react'
import type { FormEvent } from 'react'
import { Field, MachineOptions, MachineReference, Notice, Options, ScrollTable } from '../components/EquipmentUi'
import { activeMachines, changeTaskStatus, formatDay, isOutstanding, isOverdue,
  localDay, newWorkId, reportCounts, upsert, validDay } from '../frontendData'
import { demoTechnicians } from '../demoData'
import { taskStatuses } from '../models'
import type { ChangeData, DemoData, LinkedMachine, MaintenanceTask, TaskStatus } from '../models'

type Props = { data: DemoData; machines: LinkedMachine[]; changeData?: ChangeData; today: string }
const transitions: Record<TaskStatus, [label: string, status: TaskStatus][]> = {
  Scheduled: [['Start', 'In Progress'], ['Complete', 'Completed'], ['Cancel task', 'Cancelled']],
  'In Progress': [['Complete', 'Completed'], ['Cancel task', 'Cancelled']],
  Completed: [['Reopen', 'Scheduled']],
  Cancelled: [['Reopen', 'Scheduled']],
}

function TechnicianOptions() {
  return <>
    <option value="">Unassigned</option>
    {demoTechnicians.map(({ id, name }) => <option value={id} key={id}>{name} (demo)</option>)}
  </>
}

function technicianId(form: FormData) {
  return demoTechnicians.find(({ id }) => id === Number(form.get('technician')))?.id ?? null
}

export default function MaintenancePage({ data, machines, changeData, today }: Props) {
  const [filter, setFilter] = useState('All')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [editing, setEditing] = useState<string>()
  const { tasks } = data
  const choices = activeMachines(machines)
  const counts = reportCounts(data, today)
  const visible = tasks.filter((task) => filter === 'Overdue' ? isOverdue(task, today) :
    filter === 'All' || task.status === filter).sort((a, b) => a.dueDate.localeCompare(b.dueDate))

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!changeData) return
    const form = event.currentTarget
    const values = new FormData(form)
    const machineId = Number(values.get('machine'))
    const description = String(values.get('description') ?? '').trim()
    const dueDate = values.get('dueDate')
    setNotice('')

    if (!choices.some((machine) => machine.id === machineId)) return setError('Select an active machine.')
    if (description.length < 5) return setError('Describe the work using at least 5 characters.')
    if (!validDay(dueDate) || dueDate < localDay()) return setError('Choose today or a future date.')

    const task: MaintenanceTask = {
      id: newWorkId(tasks), machineId, description, dueDate, status: 'Scheduled',
      createdAt: new Date().toISOString(), completedAt: null, workPerformed: '',
      assignedTechnicianId: technicianId(values),
    }

    setError('')
    if (changeData((current) => ({ ...current, tasks: [task, ...current.tasks] }))) {
      form.reset()
      setNotice('Maintenance scheduled.')
    }
  }

  function updateTask(task: MaintenanceTask, message: string) {
    if (!changeData) return
    setNotice('')
    if (changeData((current) => ({ ...current, tasks: upsert(current.tasks, task) }))) {
      setNotice(message)
      if (editing === task.id) setEditing(undefined)
    }
  }

  return <div className="issues-layout">
    {changeData && <section className="panel">
      <h3>Schedule maintenance</h3>
      {!choices.length && <p>Add or restore a machine in Administration to schedule maintenance.</p>}
      <form className="issue-form" onSubmit={submit}>
        <div className="issue-form-row">
          <Field label="Machine">
            <select name="machine" required defaultValue="" disabled={!choices.length}>
              <option value="">Select a machine</option>
              <MachineOptions machines={choices} />
            </select>
          </Field>
          <Field label="Due date"><input name="dueDate" type="date" min={today} max="9999-12-31" required /></Field>
          <Field label="Technician"><select name="technician"><TechnicianOptions /></select></Field>
        </div>
        <Field label="Work description">
          <textarea name="description" rows={4} minLength={5} maxLength={1000} required />
        </Field>
        {error && <Notice message={error} error />}
        <button className="primary-button" type="submit" disabled={!choices.length}>Schedule maintenance</button>
      </form>
    </section>}

    <section className="panel">
      <h3>Maintenance tasks</h3>
      <p>{counts.scheduled} scheduled · {counts.inProgress} in progress · {counts.completed} completed · {counts.overdue} overdue</p>
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
      <ScrollTable label="Maintenance tasks ordered by due date">
        <thead><tr>
          <th scope="col">Machine</th><th scope="col">Work</th><th scope="col">Technician</th>
          <th scope="col">Due date</th><th scope="col">Status</th>{changeData && <th scope="col">Actions</th>}
        </tr></thead>
        <tbody>
          {!visible.length && <tr><td colSpan={changeData ? 6 : 5} className="empty-state">No maintenance tasks to show.</td></tr>}
          {visible.map((task) => <tr key={task.id}>
            <td><MachineReference machine={machines.find((machine) => machine.id === task.machineId)} id={task.machineId} /></td>
            <td className="issue-description">
              {task.description}
              {task.workPerformed && <small className="issue-area">Work performed: {task.workPerformed}</small>}
            </td>
            <td>{demoTechnicians.find(({ id }) => id === task.assignedTechnicianId)?.name ??
              (task.assignedTechnicianId === null ? 'Unassigned' : `Technician #${task.assignedTechnicianId}`)}</td>
            <td><time dateTime={task.dueDate}>{formatDay(task.dueDate)}</time></td>
            <td>
              <span className={`status-badge ${isOutstanding(task) ? 'status-maintenance' :
                task.status === 'Completed' ? 'status-operational' : 'status-neutral'}`}>{task.status}</span>
              {isOverdue(task, today) && <span className="status-badge status-down overdue-badge">Overdue</span>}
              {task.completedAt && <small className="issue-area">
                <time dateTime={task.completedAt}>{new Date(task.completedAt).toLocaleString()}</time>
              </small>}
            </td>
            {changeData && <td>
              {editing === task.id ?
                <form className="task-editor" onSubmit={(event) => {
                  event.preventDefault()
                  const values = new FormData(event.currentTarget)
                  const workPerformed = String(values.get('notes') ?? '').trim()
                  const assignedTechnicianId = values.get('technician') === 'keep' ? task.assignedTechnicianId : technicianId(values)
                  updateTask({ ...task, workPerformed, assignedTechnicianId }, 'Maintenance details saved.')
                }}>
                  <Field label="Work performed"><textarea name="notes" defaultValue={task.workPerformed} rows={3} maxLength={2000} /></Field>
                  <Field label="Technician"><select name="technician" defaultValue={
                    demoTechnicians.some(({ id }) => id === task.assignedTechnicianId) ? String(task.assignedTechnicianId) :
                      task.assignedTechnicianId === null ? '' : 'keep'
                  }>
                    {task.assignedTechnicianId !== null && !demoTechnicians.some(({ id }) => id === task.assignedTechnicianId) &&
                      <option value="keep">Technician #{task.assignedTechnicianId}</option>}
                    <TechnicianOptions />
                  </select></Field>
                  <div className="action-row">
                    <button type="submit" className="close-details">Save details</button>
                    <button type="button" className="close-details" onClick={() => setEditing(undefined)}>Cancel edit</button>
                  </div>
                </form> :
                <div className="action-row">
                  {transitions[task.status].map(([label, status]) =>
                    <button type="button" className="close-details" key={status}
                      onClick={() => updateTask(changeTaskStatus(task, status), `Task updated to ${status}.`)}>{label}</button>)}
                  <button type="button" className="close-details" onClick={() => setEditing(task.id)}>Edit details</button>
                </div>}
            </td>}
          </tr>)}
        </tbody>
      </ScrollTable>
    </section>
  </div>
}
