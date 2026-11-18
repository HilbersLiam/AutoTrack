import { useState } from 'react'
import type { FormEvent } from 'react'
import { Field, MachineOptions, MachineReference, Notice, Options, ScrollTable } from './EquipmentUi'
import { activeMachines, changeIssueStatus, newWorkId, upsert } from './frontendData'
import { isOption, issueStatuses, priorities } from './models'
import type { ChangeData, DemoData, Issue, IssueStatus, LinkedMachine } from './models'

type Props = { data: DemoData; machines: LinkedMachine[]; reportIssue: ChangeData; manageIssues?: ChangeData }

export default function IssuesPage({ data: { issues }, machines, reportIssue, manageIssues }: Props) {
  const [statusFilter, setStatusFilter] = useState('All')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const choices = activeMachines(machines)
  const visible = issues.filter((issue) => statusFilter === 'All' || issue.status === statusFilter)
  const resolved = issues.filter((issue) => issue.status === 'Resolved').length

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const values = new FormData(form)
    const machineId = Number(values.get('machine'))
    const description = String(values.get('description') ?? '').trim()
    const priority = values.get('priority')
    setNotice('')

    if (!choices.some((machine) => machine.id === machineId)) return setError('Select an active machine.')
    if (description.length < 5) return setError('Describe the problem using at least 5 characters.')
    if (!isOption(priorities, priority)) return setError('Select a priority.')

    const issue: Issue = {
      id: newWorkId(issues), machineId, description, priority, status: 'Open',
      createdAt: new Date().toISOString(), resolvedAt: null,
    }

    setError('')
    if (reportIssue((current) => ({ ...current, issues: [issue, ...current.issues] }))) {
      form.reset()
      setNotice('Issue reported.')
    }
  }

  function transition(issue: Issue, status: IssueStatus) {
    if (!manageIssues) return
    setNotice('')
    if (manageIssues((current) => ({
      ...current, issues: upsert(current.issues, changeIssueStatus(issue, status)),
    }))) setNotice(`Issue updated to ${status}.`)
  }

  return <div className="issues-layout">
    <section className="panel">
      <h3>Report a problem</h3>
      {!choices.length && <p>An active machine is required to report an issue.</p>}
      <form className="issue-form" onSubmit={submit}>
        <div className="issue-form-row">
          <Field label="Machine">
            <select name="machine" required defaultValue="" disabled={!choices.length}>
              <option value="">Select a machine</option>
              <MachineOptions machines={choices} />
            </select>
          </Field>
          <Field label="Priority">
            <select name="priority" defaultValue="Medium"><Options values={priorities} /></select>
          </Field>
        </div>
        <Field label="Problem description">
          <textarea name="description" rows={4} minLength={5} maxLength={1000} required />
        </Field>
        {error && <Notice message={error} error />}
        <button className="primary-button" type="submit" disabled={!choices.length}>Report issue</button>
      </form>
    </section>

    <section className="panel">
      <h3>Reported issues</h3>
      <p>{issues.length - resolved} unresolved · {resolved} resolved</p>
      <div className="equipment-toolbar">
        <Field label="Issue status">
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="All">All issues</option>
            <Options values={issueStatuses} />
          </select>
        </Field>
      </div>
      <Notice message={notice} />
      <ScrollTable label="Reported machine issues">
        <thead><tr>
          <th scope="col">Machine</th><th scope="col">Problem</th><th scope="col">Priority</th>
          <th scope="col">Status</th><th scope="col">Reported</th>{manageIssues && <th scope="col">Actions</th>}
        </tr></thead>
        <tbody>
          {visible.length === 0 && <tr><td colSpan={manageIssues ? 6 : 5} className="empty-state">No issues to show.</td></tr>}
          {visible.map((issue) => <tr key={issue.id}>
            <td><MachineReference machine={machines.find((machine) => machine.id === issue.machineId)} id={issue.machineId} /></td>
            <td className="issue-description">{issue.description}</td>
            <td><span className={`status-badge priority-${issue.priority.toLowerCase()}`}>{issue.priority}</span></td>
            <td><span className={`status-badge ${issue.status === 'Resolved' ? 'status-operational' : 'status-maintenance'}`}>
              {issue.status}
            </span></td>
            <td><time dateTime={issue.createdAt}>{new Date(issue.createdAt).toLocaleString()}</time></td>
            {manageIssues && <td><div className="action-row">
              {issue.status === 'Open' && <button type="button" className="close-details"
                onClick={() => transition(issue, 'In Progress')}>Start</button>}
              {issue.status === 'Resolved' ?
                <button type="button" className="close-details" onClick={() => transition(issue, 'Open')}>Reopen</button> :
                <button type="button" className="close-details" onClick={() => transition(issue, 'Resolved')}>Resolve</button>}
            </div></td>}
          </tr>)}
        </tbody>
      </ScrollTable>
    </section>
  </div>
}
