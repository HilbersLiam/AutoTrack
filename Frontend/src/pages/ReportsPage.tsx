import { useEffect, useState } from 'react'
import { getAllStatusHistory } from '../api/machineStatusHistoryApi'
import type { ApiStatusHistoryRecord } from '../api/machineStatusHistoryApi'
import { Field, MachineBadge, Notice, ScrollTable } from '../components/EquipmentUi'

export default function ReportsPage() {
  const [history, setHistory] = useState<ApiStatusHistoryRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [machineFilter, setMachineFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')

  useEffect(() => {
    let ignore = false

    async function loadHistory() {
      try {
        setLoading(true)
        const records = await getAllStatusHistory()
        if (!ignore) {
          setHistory(records)
        }
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Could not load machine status history.')
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    loadHistory()
    return () => {
      ignore = true
    }
  }, [])

  const uniqueMachines = Array.from(
    new Map(history.map((item) => [item.machineId, item.machineName])).entries()
  ).sort((a, b) => a[1].localeCompare(b[1]))

  const uniqueStatuses = Array.from(new Set(history.map((item) => item.status)))

  const visible = history.filter((item) => {
    const matchesMachine = machineFilter === 'All' || String(item.machineId) === machineFilter
    const matchesStatus = statusFilter === 'All' || item.status === statusFilter
    return matchesMachine && matchesStatus
  })

  const operationalCount = history.filter((r) => r.status === 'Operational').length
  const downCount = history.filter((r) => r.status === 'Down').length
  const maintenanceCount = history.filter((r) => r.status === 'Under Maintenance').length

  return (
    <div className="issues-layout">
      <section className="stats-grid reports-stats" aria-label="Status history summary">
        <article className="stat-card">
          <p>Total status events</p>
          <strong>{history.length}</strong>
          <small className="issue-area">Across {uniqueMachines.length} machines</small>
        </article>
        <article className="stat-card">
          <p>Operational transitions</p>
          <strong className="green">{operationalCount}</strong>
        </article>
        <article className="stat-card">
          <p>Down events</p>
          <strong className="red">{downCount}</strong>
        </article>
        <article className="stat-card">
          <p>Under maintenance events</p>
          <strong className="amber">{maintenanceCount}</strong>
        </article>
      </section>

      <section className="panel">
        <h3>Machine status history</h3>
        <p>Chronological audit log of equipment state changes recorded in MachineStatusHistory.</p>

        <div className="equipment-toolbar">
          <Field label="Machine">
            <select value={machineFilter} onChange={(e) => setMachineFilter(e.target.value)}>
              <option value="All">All machines</option>
              {uniqueMachines.map(([id, name]) => (
                <option key={id} value={String(id)}>
                  {name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Status">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="All">All statuses</option>
              {uniqueStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {error && <Notice message={error} error />}

        <ScrollTable label="Machine status history log">
          <thead>
            <tr>
              <th scope="col">Machine</th>
              <th scope="col">Area / System</th>
              <th scope="col">Status</th>
              <th scope="col">Changed By</th>
              <th scope="col">Changed At</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="empty-state">
                  Loading status history...
                </td>
              </tr>
            )}
            {!loading && visible.length === 0 && (
              <tr>
                <td colSpan={5} className="empty-state">
                  No status history records to show.
                </td>
              </tr>
            )}
            {!loading &&
              visible.map((record) => (
                <tr key={record.id}>
                  <td>{record.machineName}</td>
                  <td>
                    {record.areaName}
                    {record.systemName ? ` · ${record.systemName}` : ''}
                  </td>
                  <td>
                    <MachineBadge status={record.status as any} />
                  </td>
                  <td>{record.changedByName}</td>
                  <td>
                    <time dateTime={record.changedAt}>
                      {new Date(record.changedAt).toLocaleString()}
                    </time>
                  </td>
                </tr>
              ))}
          </tbody>
        </ScrollTable>
      </section>
    </div>
  )
}