import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { createIssueReport, getAllIssues, updateIssueStatus } from '../api/issueReportApi'
import type { ApiIssue } from '../api/issueReportApi'
import { Field, MachineOptions, MachineReference, Notice, Options, ScrollTable } from '../components/EquipmentUi'
import { activeMachines, changeIssueStatus, upsert } from '../frontendData'
import { isOption, issueStatuses, priorities } from '../models'
import type { IssueStatus, LinkedMachine } from '../models'

type Props = {
  machines: LinkedMachine[]
  canManage?: boolean
}

export default function IssuesPage({ machines, canManage = true }: Props) {
  const [issues, setIssues] = useState<ApiIssue[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('All')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const choices = activeMachines(machines)
  const visible = issues.filter((issue) => statusFilter === 'All' || issue.status === statusFilter)
  const resolved = issues.filter((issue) => issue.status === 'Resolved').length

  useEffect(() => {
    let ignore = false

    async function loadIssues() {
      try {
        setLoading(true)
        const fetchedIssues = await getAllIssues()
        if (!ignore) {
          setIssues(fetchedIssues)
        }
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Could not load issues from server.')
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    loadIssues()

    return () => {
      ignore = true
    }
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
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

    setError('')
    setSubmitting(true)

    try {
      await createIssueReport({
        machineId,
        reportedByUserId: 1, // Replace with logged-in user ID once auth is connected
        description,
        priority,
        issueStatus: 'Open',
      })

      const updatedIssues = await getAllIssues()
      setIssues(updatedIssues)

      form.reset()
      setNotice('Issue reported.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit issue.')
    } finally {
      setSubmitting(false)
    }
  }

  async function transition(issue: ApiIssue, status: IssueStatus) {
    if (!canManage || updatingId) return
    setNotice('')
    setError('')
    setUpdatingId(issue.id)

    try {
      await updateIssueStatus(issue.id, status)

      const updatedIssue: ApiIssue = {
        ...changeIssueStatus(issue, status),
        machineName: issue.machineName,
      }
      setIssues((current) => upsert(current, updatedIssue))
      setNotice(`Issue updated to ${status}.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update issue status.')
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="issues-layout">
      <section className="panel">
        <h3>Report a problem</h3>
        {!choices.length && <p>An active machine is required to report an issue.</p>}
        <form className="issue-form" onSubmit={submit}>
          <div className="issue-form-row">
            <Field label="Machine">
              <select name="machine" required defaultValue="" disabled={!choices.length || submitting}>
                <option value="">Select a machine</option>
                <MachineOptions machines={choices} />
              </select>
            </Field>
            <Field label="Priority">
              <select name="priority" defaultValue="Medium" disabled={submitting}>
                <Options values={priorities} />
              </select>
            </Field>
          </div>
          <Field label="Problem description">
            <textarea name="description" rows={4} minLength={5} maxLength={1000} required disabled={submitting} />
          </Field>
          {error && <Notice message={error} error />}
          <button className="primary-button" type="submit" disabled={!choices.length || submitting}>
            {submitting ? 'Reporting...' : 'Report issue'}
          </button>
        </form>
      </section>

      <section className="panel">
        <h3>Reported issues</h3>
        <p>
          {issues.length - resolved} unresolved · {resolved} resolved
        </p>
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
          <thead>
            <tr>
              <th scope="col">Machine</th>
              <th scope="col">Problem</th>
              <th scope="col">Priority</th>
              <th scope="col">Status</th>
              <th scope="col">Reported</th>
              {canManage && <th scope="col">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={canManage ? 6 : 5} className="empty-state">
                  Loading issues...
                </td>
              </tr>
            )}
            {!loading && visible.length === 0 && (
              <tr>
                <td colSpan={canManage ? 6 : 5} className="empty-state">
                  No issues to show.
                </td>
              </tr>
            )}
            {!loading &&
              visible.map((issue) => (
                <tr key={issue.id}>
                  <td>
                    {issue.machineName || (
                      <MachineReference
                        machine={machines.find((machine) => machine.id === issue.machineId)}
                        id={issue.machineId}
                      />
                    )}
                  </td>
                  <td className="issue-description">{issue.description}</td>
                  <td>
                    <span className={`status-badge priority-${issue.priority.toLowerCase()}`}>{issue.priority}</span>
                  </td>
                  <td>
                    <span
                      className={`status-badge ${
                        issue.status === 'Resolved' ? 'status-operational' : 'status-maintenance'
                      }`}
                    >
                      {issue.status}
                    </span>
                  </td>
                  <td>
                    <time dateTime={issue.createdAt}>{new Date(issue.createdAt).toLocaleString()}</time>
                  </td>
                  {canManage && (
                    <td>
                      <div className="action-row">
                        {issue.status === 'Open' && (
                          <button
                            type="button"
                            className="close-details"
                            disabled={updatingId === issue.id}
                            onClick={() => transition(issue, 'In Progress')}
                          >
                            Start
                          </button>
                        )}
                        {issue.status === 'Resolved' ? (
                          <button
                            type="button"
                            className="close-details"
                            disabled={updatingId === issue.id}
                            onClick={() => transition(issue, 'Open')}
                          >
                            Reopen
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="close-details"
                            disabled={updatingId === issue.id}
                            onClick={() => transition(issue, 'Resolved')}
                          >
                            Resolve
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
          </tbody>
        </ScrollTable>
      </section>
    </div>
  )
}