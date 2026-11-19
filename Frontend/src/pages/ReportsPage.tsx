import { ScrollTable } from '../components/EquipmentUi'
import { reportBreakdown, reportCounts } from '../frontendData'
import type { DemoData } from '../models'

export default function ReportsPage({ data, today }: { data: DemoData; today: string }) {
  const counts = reportCounts(data, today)
  const rows = reportBreakdown(data, today)

  return <div className="issues-layout">
    <section className="stats-grid reports-stats" aria-label="Key metrics">
      <article className="stat-card">
        <p>Currently operational</p>
        <strong className="green">{counts.percentage === null ? '—' : `${counts.percentage}%`}</strong>
        <small className="issue-area">{counts.operational} of {counts.machines} active machines</small>
      </article>
      <article className="stat-card"><p>Machines down</p><strong className="red">{counts.down}</strong></article>
      <article className="stat-card">
        <p>Unresolved issue records</p><strong className="amber">{counts.unresolved}</strong>
        <small className="issue-area">{counts.highPriority} high priority</small>
      </article>
      <article className="stat-card"><p>Overdue tasks</p><strong className="red">{counts.overdue}</strong></article>
    </section>

    <section className="panel">
      <h3>Production areas and systems</h3>
      <p>Machine counts cover active equipment. Work records include archived equipment and follow each machine's current system.</p>
      <ScrollTable label="Machine health and work by production area and system">
        <thead><tr>
          <th scope="col">Area / system</th><th scope="col">Active machines</th><th scope="col">Operational</th>
          <th scope="col">Down</th><th scope="col">Under maintenance</th><th scope="col">Unresolved issues</th>
          <th scope="col">Outstanding tasks</th><th scope="col">Completed tasks</th><th scope="col">Overdue tasks</th>
        </tr></thead>
        <tbody>
          {!rows.length && <tr><td colSpan={9} className="empty-state">No production areas to report on.</td></tr>}
          {rows.map(({ key, name, isSystem, counts }) => <tr key={key} className={isSystem ? 'report-system' : 'report-area'}>
            <th scope="row">{name}</th>
            <td>{counts.machines}</td><td>{counts.operational}</td><td>{counts.down}</td><td>{counts.underMaintenance}</td>
            <td>{counts.unresolved}</td><td>{counts.outstanding}</td><td>{counts.completed}</td><td>{counts.overdue}</td>
          </tr>)}
        </tbody>
      </ScrollTable>
    </section>

    <section className="panel">
      <h3>Work summary</h3>
      <p>Unresolved issues include Open and In Progress. Outstanding maintenance includes Scheduled and In Progress and excludes Completed and Cancelled.</p>
      <dl className="details-grid">
        <div><dt>Issue records</dt><dd>{data.issues.length}</dd></div>
        <div><dt>Resolved issues</dt><dd>{data.issues.length - counts.unresolved}</dd></div>
        <div><dt>Scheduled tasks</dt><dd>{counts.scheduled}</dd></div>
        <div><dt>In-progress tasks</dt><dd>{counts.inProgress}</dd></div>
        <div><dt>Outstanding tasks</dt><dd>{counts.outstanding}</dd></div>
        <div><dt>Completed tasks</dt><dd>{counts.completed}</dd></div>
      </dl>
    </section>
  </div>
}
