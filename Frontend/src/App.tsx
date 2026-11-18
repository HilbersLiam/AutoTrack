import './App.css'
import IssuesPage from './IssuesPage'
import MaintenancePage from './MaintenancePage'
import ReportsPage from './ReportsPage'
import AdministrationPage from './AdministrationPage'
import { useEffect, useRef, useState } from 'react'

import { activeMachines, linkedMachines, reportCounts, localDay } from './frontendData'
import type { loadDemo } from './frontendData'
import type { ChangeData, MachineStatus } from './models'
import { MachineBadge, MachineOptions, Options } from './EquipmentUi'
import { isOption, machineStatuses } from './models'

function App({ store }: { store: ReturnType<typeof loadDemo> }) {
  const [activePage, setActivePage] = useState('Overview')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [data, setData] = useState(store.data)
  const [saveError, setSaveError] = useState(store.initialSaveFailed ? 'Demo data could not be saved in this browser.' : '')
  const [today, setToday] = useState(localDay)
  useEffect(() => {
    const interval = window.setInterval(() => setToday(localDay()), 30_000)
    return () => window.clearInterval(interval)
  }, [])
  const [selectedMachineId, setSelectedMachineId] = useState<number | null>(null)
  const machineDetailsRef = useRef<HTMLDivElement>(null)
  const allMachines = linkedMachines(data)
  const machines = activeMachines(allMachines)
  const selectedMachine = machines.find((machine) => machine.id === selectedMachineId)
  const counts = reportCounts(data, today)

  const changeData: ChangeData = (update) => {
    const next = update(data)
    if (!store.save(next)) {
      setSaveError('Change could not be saved. Check browser storage or reload if another tab updated the demo.')
      return false
    }
    setData(next)
    setSaveError('')
    return true
  }

  function updateMachineStatus(machineId: number, status: MachineStatus) {
    changeData((current) => ({
      ...current,
      machines: current.machines.map((machine) =>
        machine.id === machineId ? { ...machine, status } : machine
      ),
    }))
  }

  const filteredMachines = machines.filter((machine) => {
    const matchesSearch = [machine.name, machine.areaName, machine.systemName, machine.location]
      .some((value) => value.toLowerCase().includes(searchTerm.trim().toLowerCase()))

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
    'Administration',
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
            <span className="demo-label">Demo data</span>

            <h2>
              {activePage === 'Overview' ? 'Plant overview' : activePage}
            </h2>

            {activePage === 'Overview' && <p>Equipment health across your production areas.</p>}
          </div>
          {store.warning && <p className="storage-warning" role="status">{store.warning}</p>}
          {saveError && <p className="storage-warning" role="alert">{saveError}</p>}
        </header>

        {activePage === 'Overview' ? (
          <>
            <section className="stats-grid" aria-label="Machine summary">
              <article className="stat-card"><p>Active machines</p><strong>{counts.machines}</strong></article>
              <article className="stat-card"><p>Operational</p><strong className="green">{counts.operational}</strong></article>
              <article className="stat-card"><p>Down</p><strong className="red">{counts.down}</strong></article>
              <article className="stat-card"><p>Under maintenance</p><strong className="amber">{counts.underMaintenance}</strong></article>
            </section>

            <section className="panel">
              <h3>Production areas</h3>
              {data.areas.length === 0 && <p>No production areas yet.</p>}
              <div className="areas-grid">
                {data.areas.map((area) => {
                  const systems = data.systems.filter((system) => system.areaId === area.id)
                  const areaMachines = machines.filter((machine) => machine.areaId === area.id)
                  return <article className="area-card" key={area.id}>
                    <h4>{area.name}</h4>
                    <p className="area-summary">{areaMachines.length} active machines</p>
                    {systems.length === 0 && <p className="system-group">No systems in this area.</p>}
                    {systems.map((system) => {
                      const systemMachines = areaMachines.filter((machine) => machine.systemId === system.id)
                      return <section className="system-group" key={system.id}>
                        <h5>{system.name}</h5>
                        {systemMachines.length === 0 ? <p>No active machines in this system.</p> :
                          <ul className="machine-list">
                            {systemMachines.map((machine) => <li className="machine-row" key={machine.id}>
                              <span>{machine.name}</span>
                              <MachineBadge status={machine.status} />
                            </li>)}
                          </ul>}
                      </section>
                    })}
                  </article>
                })}
              </div>
            </section>
          </>
        ) : activePage === 'Equipment' ? (
          <section className="panel">
            <h3>Machine directory</h3>

            <div className="equipment-toolbar">
              <div className="filter-field search-field">
                <label htmlFor="machine-search">Search machines</label>
                <input
                  id="machine-search"
                  type="search"
                  placeholder="Search name, area, system, or location"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>

              <div className="filter-field">
                <label htmlFor="machine-picker">Browse machines</label>
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
                        machineDetailsRef.current?.scrollIntoView({ block: 'nearest' })
                      })
                    }
                  }}
                >
                  <option value="">{machines.length ? 'Select a machine' : 'No active machines'}</option>
                  <MachineOptions machines={machines} />
                </select>
              </div>

              <div className="filter-field">
                <label htmlFor="status-filter">Machine status</label>
                <select
                  id="status-filter"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                >
                  <option value="All">All statuses</option>
                  <Options values={machineStatuses} />
                </select>
              </div>
            </div>

            <p className="results-count" role="status">
              Showing {filteredMachines.length} of {machines.length} machines
            </p>

            <div className="table-container" tabIndex={0} role="region" aria-label="Machine directory">
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
                        <td>M-{String(machine.id).padStart(3, '0')}</td>
                        <td>
                          <button
                            type="button"
                            className="machine-link"
                            aria-expanded={selectedMachineId === machine.id}
                            aria-controls="machine-details"
                            onClick={() => setSelectedMachineId(machine.id)}
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
                    <h4 id="machine-details-title">{selectedMachine.name}</h4>

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

                    <div><dt>Machine system</dt><dd>{selectedMachine.systemName}</dd></div>
                    <div><dt>Location</dt><dd>{selectedMachine.location || 'Unspecified'}</dd></div>
                    <div><dt>Status</dt><dd><MachineBadge status={selectedMachine.status} /></dd></div>
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
                            updateMachineStatus(selectedMachine.id, newStatus)
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
          <IssuesPage data={data} machines={allMachines} changeData={changeData} />
        ) : activePage === 'Maintenance' ? (
          <MaintenancePage data={data} machines={allMachines} changeData={changeData} today={today} />
        ) : activePage === 'Reports' ? (
          <ReportsPage data={data} today={today} />
        ) : (
          <AdministrationPage data={data} machines={allMachines} changeData={changeData} />
        )}
      </main>
    </div>
  )
}

export default App
