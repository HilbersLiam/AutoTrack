import { useRef, useState } from 'react'
import { MachineBadge, MachineOptions, Options } from '../components/EquipmentUi'
import { machineStatuses } from '../models'
import type { OverviewState } from '../hooks/useLiveOverview'

export default function EquipmentPage({ live }: { live: OverviewState }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [selectedMachineId, setSelectedMachineId] = useState<number | null>(null)
  const machineDetailsRef = useRef<HTMLDivElement>(null)

  const machines = live.state === 'ready' ? live.overview.machines : []

  const selectedMachine = machines.find(
    (machine) => machine.id === selectedMachineId
  )

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
    <section className="panel">
      <h3>Machine directory</h3>

      {live.state === 'loading' && <p role="status">Loading machines…</p>}
      {live.state === 'error' && (
        <p className="storage-warning" role="alert">
          Could not load machines. {live.message}
        </p>
      )}

      {live.state === 'ready' && (
        <>
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
              </section>
            )}
          </div>
        </>
      )}
    </section>
  )
}