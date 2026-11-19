import './App.css'
import EquipmentPage from './pages/EquipmentPage'
import IssuesPage from './pages/IssuesPage'
import MaintenancePage from './pages/MaintenancePage'
import ReportsPage from './pages/ReportsPage'
import AdministrationPage from './pages/AdministrationPage'
import { useEffect, useState } from 'react'

import { localDay } from './frontendData'
import type { loadDemo } from './frontendData'
import type { LinkedMachine } from './models'

import { Field, MachineBadge } from './components/EquipmentUi'
import { useLiveOverview } from './hooks/useLiveOverview'
import { can, demoRoles } from './permissions'

const pages = ['Overview', 'Equipment', 'Issues', 'Maintenance', 'Reports', 'Administration'] as const
type Page = typeof pages[number]

function App(_props: { store?: ReturnType<typeof loadDemo> }) {
  const [demoRole, setDemoRole] = useState<keyof typeof demoRoles>('normal')
  const role = demoRoles[demoRole]
  const currentUserId = demoRole === 'admin' ? 2 : 1
  const [requestedPage, setActivePage] = useState<Page>('Overview')
  const canView = (page: Page) => page !== 'Administration' || can(role, 'administration')
  const activePage = canView(requestedPage) ? requestedPage : 'Overview'

  const live = useLiveOverview()

  const [today, setToday] = useState(localDay)

  useEffect(() => {
    const interval = window.setInterval(
      () => setToday(localDay()),
      30_000
    )

    return () => window.clearInterval(interval)
  }, [])

  // Live API machines extracted from useLiveOverview
  const liveMachines: LinkedMachine[] =
    live.state === 'ready'
      ? live.overview.areas.flatMap((area) =>
          area.systems.flatMap((system) =>
            system.machines.map((machine) => ({
              ...machine,
              status: machine.status ?? 'Operational',
              location: area.name,
              isArchived: false,
              areaId: area.id,
              areaName: area.name,
              systemId: system.id ?? 0,
              systemName: system.name,
            }))
          )
        )
      : []

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <h1 className="brand">
          Auto<span>Track</span>
        </h1>

        <nav aria-label="Main navigation">
          {pages.filter(canView).map((page) => (
            <button
              key={page}
              type="button"
              className={`nav-item ${activePage === page ? 'active' : ''}`}
              aria-current={activePage === page ? 'page' : undefined}
              onClick={() => setActivePage(page)}
            >
              {page}
            </button>
          ))}
        </nav>

        <div className="user-profile">
          <Field label="Demo role">
            <select
              value={demoRole}
              aria-describedby="demo-role-note"
              onChange={(event) => {
                const nextRole = event.target.value === 'admin' ? 'admin' : 'normal'
                setDemoRole(nextRole)
                if (!can(demoRoles[nextRole], 'administration') && activePage === 'Administration') {
                  setActivePage('Overview')
                }
              }}
            >
              <option value="normal">Normal User</option>
              <option value="admin">Admin</option>
            </select>
            <small id="demo-role-note">Interface preview only</small>
          </Field>
        </div>
      </aside>

      <main className="main-content">
        <header className="page-header">
          <div>
            <span className="demo-label">Live API data</span>

            <h2>
              {activePage === 'Overview'
                ? 'Plant overview'
                : activePage}
            </h2>

            {activePage === 'Overview' && (
              <p>Equipment health across your production areas.</p>
            )}
          </div>
        </header>

        {activePage === 'Overview' ? (
          <>
            {live.state === 'ready' && (
              <section className="stats-grid" aria-label="Machine summary">
                <article className="stat-card">
                  <p>Active machines</p>
                  <strong>{live.overview.machineCount}</strong>
                </article>
                <article className="stat-card">
                  <p>Operational</p>
                  <strong className="green">{live.overview.counts.Operational}</strong>
                </article>
                <article className="stat-card">
                  <p>Down</p>
                  <strong className="red">{live.overview.counts.Down}</strong>
                </article>
                <article className="stat-card">
                  <p>Under maintenance</p>
                  <strong className="amber">{live.overview.counts['Under Maintenance']}</strong>
                </article>
              </section>
            )}
            <section className="panel">
              <h3>Production areas</h3>
              {live.state === 'loading' && <p role="status">Loading production areas…</p>}
              {live.state === 'error' && (
                <p className="storage-warning" role="alert">
                  Could not load production areas. {live.message}
                </p>
              )}
              {live.state === 'ready' && (
                <>
                  {live.overview.counts.Unknown > 0 && (
                    <p>Unknown status · {live.overview.counts.Unknown}</p>
                  )}
                  {live.overview.areas.length === 0 ? (
                    <p>No production areas found.</p>
                  ) : (
                    <div className="areas-grid">
                      {live.overview.areas.map((area) => (
                        <article className="area-card" key={area.id}>
                          <h4>{area.name}</h4>
                          <p className="area-summary">{area.machineCount} machines</p>
                          {area.systems.length === 0 && <p>No machines in this area.</p>}
                          {area.systems.map((system) => (
                            <div className="system-group" key={system.id ?? 'unavailable'}>
                              <h5>{system.name}</h5>
                              {system.machines.length === 0 ? (
                                <p>No machines in this system.</p>
                              ) : (
                                <ul className="machine-list">
                                  {system.machines.map((machine) => (
                                    <li className="machine-row" key={machine.id}>
                                      <span>{machine.name}</span>
                                      <MachineBadge status={machine.status} />
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ))}
                        </article>
                      ))}
                    </div>
                  )}
                </>
              )}
            </section>
          </>
        ) : activePage === 'Equipment' ? (
          <EquipmentPage live={live} />
        ) : activePage === 'Issues' ? (
          <IssuesPage
            machines={liveMachines}
            currentUserId={currentUserId}
            canManage={can(role, 'manageIssues')}
          />
        ) : activePage === 'Maintenance' ? (
          <MaintenancePage
            machines={liveMachines}
            currentUserId={currentUserId}
            canManage={can(role, 'manageMaintenance')}
            today={today}
          />
        ) : activePage === 'Reports' ? (
          <ReportsPage />
        ) : activePage === 'Administration' && can(role, 'administration') ? (
          <AdministrationPage currentUserId={currentUserId} />
        ) : null}
      </main>
    </div>
  )
}

export default App