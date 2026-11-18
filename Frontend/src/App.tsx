
import './App.css'
import IssuesPage from './IssuesPage'
import MaintenancePage from './MaintenancePage'
import ReportsPage from './ReportsPage'
import AdministrationPage from './AdministrationPage'
import { useEffect, useRef, useState } from 'react'

import {
  activeMachines,
  linkedMachines,
  localDay
} from './frontendData'

import type { loadDemo } from './frontendData'

import type {
  ChangeData,
  MachineStatus
} from './models'

import { Field, MachineBadge, MachineOptions, Options } from './EquipmentUi'
import { isOption, machineStatuses } from './models'
import { parseLiveOverview } from './liveOverview'
import { can, demoRoles } from './permissions'
import type { Permission } from './permissions'

// Change this if your API uses a different URL or port.
const PRODUCTION_AREAS_API_URL =
  'http://localhost:5091/api/ProductionArea'

const pages = ['Overview', 'Equipment', 'Issues', 'Maintenance', 'Reports', 'Administration'] as const
type Page = typeof pages[number]
type OverviewState =
  | { state: 'loading' }
  | { state: 'error'; message: string }
  | { state: 'ready'; overview: ReturnType<typeof parseLiveOverview> }

function App({ store }: { store: ReturnType<typeof loadDemo> }) {
  const [demoRole, setDemoRole] = useState<keyof typeof demoRoles>('normal')
  const role = demoRoles[demoRole]
  const [requestedPage, setActivePage] = useState<Page>('Overview')
  const canView = (page: Page) => page !== 'Administration' || can(role, 'administration')
  const activePage = canView(requestedPage) ? requestedPage : 'Overview'
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')

  // Existing demo data used by the other dashboard pages.
  const [data, setData] = useState(store.data)
  const [saveError, setSaveError] = useState(
    store.initialSaveFailed
      ? 'Demo data could not be saved in this browser.'
      : ''
  )

  const [live, setLive] = useState<OverviewState>({ state: 'loading' })

  const [today, setToday] = useState(localDay)

  useEffect(() => {
    const interval = window.setInterval(
      () => setToday(localDay()),
      30_000
    )

    return () => window.clearInterval(interval)
  }, [])

  // Retrieve production areas from the ASP.NET Core API.
  useEffect(() => {
    const controller = new AbortController()

    const fetchProductionAreas = async () => {
      try {
        const response = await fetch(
          PRODUCTION_AREAS_API_URL,
          { signal: controller.signal }
        )

        if (!response.ok) {
          throw new Error(
            `HTTP Error: ${response.status} ${response.statusText}`
          )
        }

        const overview = parseLiveOverview(await response.json())
        if (!controller.signal.aborted) setLive({ state: 'ready', overview })
      } catch (error) {
        if (!controller.signal.aborted) {
          setLive({ state: 'error', message: error instanceof Error ? error.message : 'Request failed.' })
        }
      }
    }

    fetchProductionAreas()

    return () => controller.abort()
  }, [])

  const [selectedMachineId, setSelectedMachineId] =
    useState<number | null>(null)

  const machineDetailsRef = useRef<HTMLDivElement>(null)

  const allMachines = linkedMachines(data)
  const machines = activeMachines(allMachines)

  const selectedMachine = machines.find(
    (machine) => machine.id === selectedMachineId
  )

  function changeData(permission: Permission, update: Parameters<ChangeData>[0]) {
    if (!can(role, permission)) return false
    const next = update(data)

    if (!store.save(next)) {
      setSaveError(
        'Change could not be saved. Check browser storage or reload if another tab updated the demo.'
      )

      return false
    }

    setData(next)
    setSaveError('')
    return true
  }

  function updateMachineStatus(
    machineId: number,
    status: MachineStatus
  ) {
    changeData('changeMachineStatus', (current) => ({
      ...current,
      machines: current.machines.map((machine) =>
        machine.id === machineId
          ? { ...machine, status }
          : machine
      )
    }))
  }

  const filteredMachines = machines.filter((machine) => {
    const matchesSearch = [
      machine.name,
      machine.areaName,
      machine.systemName,
      machine.location
    ].some((value) =>
      value.toLowerCase().includes(searchTerm.trim().toLowerCase())
    )

    const matchesStatus =
      statusFilter === 'All' || machine.status === statusFilter

    return matchesSearch && matchesStatus
  })

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
            <select value={demoRole} aria-describedby="demo-role-note" onChange={(event) => {
              const nextRole = event.target.value === 'admin' ? 'admin' : 'normal'
              setDemoRole(nextRole)
              if (!can(demoRoles[nextRole], 'administration') && activePage === 'Administration') {
                setActivePage('Overview')
              }
            }}>
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
            <span className="demo-label">
              {activePage === 'Overview' ? 'Live API data' : 'Demo data · browser storage'}
            </span>

            <h2>
              {activePage === 'Overview'
                ? 'Plant overview'
                : activePage}
            </h2>

            {activePage === 'Overview' && (
              <p>Equipment health across your production areas.</p>
            )}
          </div>

          {store.warning && (
            <p className="storage-warning" role="status">
              {store.warning}
            </p>
          )}

          {saveError && (
            <p className="storage-warning" role="alert">
              {saveError}
            </p>
          )}
        </header>

        {activePage === 'Overview' ? (
          <>
            {live.state === 'ready' && (
              <section className="stats-grid" aria-label="Machine summary">
                <article className="stat-card"><p>Active machines</p><strong>{live.overview.machineCount}</strong></article>
                <article className="stat-card"><p>Operational</p><strong className="green">{live.overview.counts.Operational}</strong></article>
                <article className="stat-card"><p>Down</p><strong className="red">{live.overview.counts.Down}</strong></article>
                <article className="stat-card">
                  <p>Under maintenance</p><strong className="amber">{live.overview.counts['Under Maintenance']}</strong>
                </article>
              </section>
            )}
            <section className="panel">
              <h3>Production areas</h3>
              {live.state === 'loading' && <p role="status">Loading production areas…</p>}
              {live.state === 'error' && (
                <p className="storage-warning" role="alert">Could not load production areas. {live.message}</p>
              )}
              {live.state === 'ready' && (
                <>
                  {live.overview.counts.Unknown > 0 && <p>Unknown status · {live.overview.counts.Unknown}</p>}
                  {live.overview.areas.length === 0 ? <p>No production areas found.</p> : (
                    <div className="areas-grid">
                      {live.overview.areas.map((area) => (
                        <article className="area-card" key={area.id}>
                          <h4>{area.name}</h4>
                          <p className="area-summary">{area.machineCount} machines</p>
                          {area.systems.length === 0 && <p>No machines in this area.</p>}
                          {area.systems.map((system) => (
                            <div className="system-group" key={system.id ?? 'unavailable'}>
                              <h5>{system.name}</h5>
                              {system.machines.length === 0 ? <p>No machines in this system.</p> : (
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
          <section className="panel">
            <h3>Machine directory</h3>

            <div className="equipment-toolbar">
              <div className="filter-field search-field">
                <label htmlFor="machine-search">
                  Search machines
                </label>

                <input
                  id="machine-search"
                  type="search"
                  placeholder="Search name, area, system, or location"
                  value={searchTerm}
                  onChange={(event) =>
                    setSearchTerm(event.target.value)
                  }
                />
              </div>

              <div className="filter-field">
                <label htmlFor="machine-picker">
                  Browse machines
                </label>

                <select
                  id="machine-picker"
                  aria-controls="machine-details"
                  value={selectedMachine?.id ?? ''}
                  disabled={machines.length === 0}
                  onChange={(event) => {
                    const id = event.target.value

                    setSelectedMachineId(id ? Number(id) : null)

                    if (id) {
                      requestAnimationFrame(() => {
                        machineDetailsRef.current?.scrollIntoView({
                          block: 'nearest'
                        })
                      })
                    }
                  }}
                >
                  <option value="">
                    {machines.length
                      ? 'Select a machine'
                      : 'No active machines'}
                  </option>

                  <MachineOptions machines={machines} />
                </select>
              </div>

              <div className="filter-field">
                <label htmlFor="status-filter">
                  Machine status
                </label>

                <select
                  id="status-filter"
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value)
                  }
                >
                  <option value="All">All statuses</option>
                  <Options values={machineStatuses} />
                </select>
              </div>
            </div>

            <p className="results-count" role="status">
              Showing {filteredMachines.length} of {machines.length} machines
            </p>

            <div
              className="table-container"
              tabIndex={0}
              role="region"
              aria-label="Machine directory"
            >
              <table className="equipment-table">
                <caption className="visually-hidden">
                  Machines matching your search and status filter
                </caption>

                <thead>
                  <tr>
                    <th scope="col">Machine ID</th>
                    <th scope="col">Machine name</th>
                    <th scope="col">Production area</th>
                    <th scope="col">Machine system</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredMachines.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="empty-state">
                        No machines found. Try another search or status.
                      </td>
                    </tr>
                  ) : (
                    filteredMachines.map((machine) => (
                      <tr key={machine.id}>
                        <td>
                          M-{String(machine.id).padStart(3, '0')}
                        </td>

                        <td>
                          <button
                            type="button"
                            className="machine-link"
                            aria-expanded={selectedMachineId === machine.id}
                            aria-controls="machine-details"
                            onClick={() =>
                              setSelectedMachineId(machine.id)
                            }
                          >
                            {machine.name}
                          </button>
                        </td>

                        <td>{machine.areaName}</td>
                        <td>{machine.systemName}</td>

                        <td>
                          <MachineBadge status={machine.status} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div id="machine-details" ref={machineDetailsRef}>
              {selectedMachine && (
                <section
                  className="machine-details"
                  aria-labelledby="machine-details-title"
                >
                  <div className="details-header">
                    <h4 id="machine-details-title">
                      {selectedMachine.name}
                    </h4>

                    <button
                      type="button"
                      className="close-details"
                      onClick={() => setSelectedMachineId(null)}
                    >
                      Close details
                    </button>
                  </div>

                  <dl className="details-grid">
                    <div>
                      <dt>Machine ID</dt>
                      <dd>
                        M-{String(selectedMachine.id).padStart(3, '0')}
                      </dd>
                    </div>

                    <div>
                      <dt>Production area</dt>
                      <dd>{selectedMachine.areaName}</dd>
                    </div>

                    <div>
                      <dt>Machine system</dt>
                      <dd>{selectedMachine.systemName}</dd>
                    </div>

                    <div>
                      <dt>Location</dt>
                      <dd>
                        {selectedMachine.location || 'Unspecified'}
                      </dd>
                    </div>

                    <div>
                      <dt>Status</dt>
                      <dd>
                        <MachineBadge status={selectedMachine.status} />
                      </dd>
                    </div>
                  </dl>

                  {can(role, 'changeMachineStatus') && <div className="status-editor">
                    <div className="filter-field">
                      <label htmlFor="update-machine-status">
                        Change machine status
                      </label>

                      <select
                        id="update-machine-status"
                        value={selectedMachine.status}
                        onChange={(event) => {
                          const newStatus = event.target.value

                          if (isOption(machineStatuses, newStatus)) {
                            updateMachineStatus(
                              selectedMachine.id,
                              newStatus
                            )
                          }
                        }}
                      >
                        <Options values={machineStatuses} />
                      </select>
                    </div>
                  </div>}
                </section>
              )}
            </div>
          </section>
        ) : activePage === 'Issues' ? (
          <IssuesPage
            data={data}
            machines={allMachines}
            reportIssue={(update) => changeData('reportIssue', update)}
            manageIssues={can(role, 'manageIssues') ? (update) => changeData('manageIssues', update) : undefined}
          />
        ) : activePage === 'Maintenance' ? (
          <MaintenancePage
            data={data}
            machines={allMachines}
            changeData={can(role, 'manageMaintenance') ? (update) => changeData('manageMaintenance', update) : undefined}
            today={today}
          />
        ) : activePage === 'Reports' ? (
          <ReportsPage data={data} today={today} />
        ) : activePage === 'Administration' && can(role, 'administration') ? (
          <AdministrationPage
            data={data}
            machines={allMachines}
            changeData={(update) => changeData('administration', update)}
          />
        ) : null}
      </main>
    </div>
  )
}

export default App
