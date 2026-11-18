
import './App.css'
import IssuesPage from './IssuesPage'
import MaintenancePage from './MaintenancePage'
import ReportsPage from './ReportsPage'
import AdministrationPage from './AdministrationPage'
import { useEffect, useRef, useState } from 'react'

import {
  activeMachines,
  linkedMachines,
  reportCounts,
  localDay
} from './frontendData'

import type { loadDemo } from './frontendData'

import type {
  ChangeData,
  MachineStatus,
  ProductionAreaMachineDto
} from './models'

import { MachineBadge, MachineOptions, Options } from './EquipmentUi'
import { isOption, machineStatuses } from './models'

// Change this if your API uses a different URL or port.
const PRODUCTION_AREAS_API_URL =
  'http://localhost:5091/api/ProductionArea'

// Structure used to group machines under their production areas.
type GroupedProductionArea = {
  id: number
  name: string
  machines: {
    id: number
    name: string
    status: string | null
  }[]
}

function App({ store }: { store: ReturnType<typeof loadDemo> }) {
  const [activePage, setActivePage] = useState('Overview')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')

  // Existing demo data used by the other dashboard pages.
  const [data, setData] = useState(store.data)
  const [saveError, setSaveError] = useState(
    store.initialSaveFailed
      ? 'Demo data could not be saved in this browser.'
      : ''
  )

  // Live production area data retrieved from the C# API.
  const [productionAreas, setProductionAreas] =
    useState<ProductionAreaMachineDto[]>([])

  const [productionAreasLoading, setProductionAreasLoading] =
    useState(true)

  const [productionAreasError, setProductionAreasError] =
    useState<string | null>(null)

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

        const result: ProductionAreaMachineDto[] =
          await response.json()

        setProductionAreas(result)

      } catch (error) {
        if (controller.signal.aborted) {
          return
        }

        setProductionAreasError(
          error instanceof Error
            ? error.message
            : 'Failed to retrieve production areas.'
        )

      } finally {
        if (!controller.signal.aborted) {
          setProductionAreasLoading(false)
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

  const counts = reportCounts(data, today)

  // Group the flat API response into production areas.
  const groupedAreas = Array.from(
    productionAreas.reduce((groups, row) => {
      let area = groups.get(row.areaID)

      // Create the production area if it doesn't exist yet.
      if (!area) {
        area = {
          id: row.areaID,
          name: row.areaName,
          machines: []
        }

        groups.set(row.areaID, area)
      }

      // Add the machine if this production area has one.
      if (
        row.machineID !== null &&
        row.machineName !== null
      ) {
        area.machines.push({
          id: row.machineID,
          name: row.machineName,
          status: row.currentStatus
        })
      }

      return groups

    }, new Map<number, GroupedProductionArea>())
      .values()
  )

  const changeData: ChangeData = (update) => {
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
    changeData((current) => ({
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

  const pages = [
    'Overview',
    'Equipment',
    'Issues',
    'Maintenance',
    'Reports',
    'Administration'
  ]

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <h1 className="brand">
          Auto<span>Track</span>
        </h1>

        <nav aria-label="Main navigation">
          {pages.map((page) => (
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
          <div className="avatar">OW</div>

          <div>
            <strong>Omar Waled</strong>
            <small>Demo user</small>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="page-header">
          <div>
            <span className="demo-label">
              Production areas: live API | Other sections: demo data
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
            <section className="stats-grid" aria-label="Machine summary">
              <article className="stat-card">
                <p>Active machines</p>
                <strong>{counts.machines}</strong>
              </article>

              <article className="stat-card">
                <p>Operational</p>
                <strong className="green">{counts.operational}</strong>
              </article>

              <article className="stat-card">
                <p>Down</p>
                <strong className="red">{counts.down}</strong>
              </article>

              <article className="stat-card">
                <p>Under maintenance</p>
                <strong className="amber">
                  {counts.underMaintenance}
                </strong>
              </article>
            </section>

            {/* Production areas now use live API data. */}
            <section className="panel">
              <h3>Production areas</h3>

              {productionAreasLoading && (
                <p>Loading production areas...</p>
              )}

              {productionAreasError && (
                <p className="storage-warning" role="alert">
                  Could not load production areas: {productionAreasError}
                </p>
              )}

              {!productionAreasLoading &&
                !productionAreasError &&
                groupedAreas.length === 0 && (
                  <p>No production areas found.</p>
                )}

              {!productionAreasLoading &&
                !productionAreasError &&
                groupedAreas.length > 0 && (
                  <div className="areas-grid">
                    {groupedAreas.map((area) => (
                      <article className="area-card" key={area.id}>
                        <h4>{area.name}</h4>

                        <p className="area-summary">
                          {area.machines.length} machines
                        </p>

                        {area.machines.length === 0 ? (
                          <p>No machines in this area.</p>
                        ) : (
                          <ul className="machine-list">
                            {area.machines.map((machine) => (
                              <li
                                className="machine-row"
                                key={machine.id}
                              >
                                <span>{machine.name}</span>

                                <span>
                                  {machine.status ?? 'Unknown'}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </article>
                    ))}
                  </div>
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

                  <div className="status-editor">
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
                  </div>
                </section>
              )}
            </div>
          </section>
        ) : activePage === 'Issues' ? (
          <IssuesPage
            data={data}
            machines={allMachines}
            changeData={changeData}
          />
        ) : activePage === 'Maintenance' ? (
          <MaintenancePage
            data={data}
            machines={allMachines}
            changeData={changeData}
            today={today}
          />
        ) : activePage === 'Reports' ? (
          <ReportsPage data={data} today={today} />
        ) : (
          <AdministrationPage
            data={data}
            machines={allMachines}
            changeData={changeData}
          />
        )}
      </main>
    </div>
  )
}

export default App
