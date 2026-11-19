import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  createArea,
  createMachine,
  createSystem,
  getAdminData,
  setMachineArchived,
  updateArea,
  updateMachine,
  updateSystem,
} from '../api/administrationApi'
import type { ApiAdminMachine, ApiMachineSystem, ApiProductionArea } from '../api/administrationApi'
import { Field, MachineBadge, Notice, Options, ScrollTable } from '../components/EquipmentUi'
import { isOption, machineStatuses } from '../models'

type Props = {
  currentUserId: number
  onChanged?: () => void
}

type Message = { message: string; error?: boolean }

function textValue(form: FormData, field: string) {
  return String(form.get(field) ?? '').trim()
}

function nameError(name: string, records: { id: number; name: string }[], editingId?: number) {
  if (!name) return 'Enter a name.'
  if (
    records.some(
      (item) => item.id !== editingId && item.name.trim().toLowerCase() === name.toLowerCase()
    )
  ) {
    return 'This name is already in use here.'
  }
  return ''
}

function AreaOptions({ areas }: { areas: ApiProductionArea[] }) {
  return areas.map(({ id, name }) => (
    <option key={id} value={id}>
      {name}
    </option>
  ))
}

function AreaEditor({
  areas,
  onReload,
}: {
  areas: ApiProductionArea[]
  onReload: () => Promise<void>
}) {
  const [editing, setEditing] = useState<ApiProductionArea>()
  const [notice, setNotice] = useState<Message>()
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return

    const form = event.currentTarget
    const values = new FormData(form)
    const areaName = textValue(values, 'name')
    const description = textValue(values, 'description')
    const error = nameError(areaName, areas, editing?.id)
    if (error) return setNotice({ message: error, error: true })

    setSaving(true)
    setNotice(undefined)

    try {
      if (editing) {
        await updateArea(editing.id, { areaName, description })
      } else {
        await createArea({ areaName, description })
      }
      await onReload()
      form.reset()
      setNotice({ message: editing ? 'Area updated.' : 'Area added.' })
      setEditing(undefined)
    } catch (err) {
      setNotice({
        message: err instanceof Error ? err.message : 'Could not save production area.',
        error: true,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="panel">
      <h3>Production areas</h3>
      <form className="issue-form" key={editing?.id ?? 'new'} onSubmit={submit}>
        <div className="issue-form-row">
          <Field label="Area name">
            <input name="name" required maxLength={100} defaultValue={editing?.name} disabled={saving} />
          </Field>
          <Field label="Description">
            <input
              name="description"
              maxLength={500}
              defaultValue={editing?.description}
              placeholder="Optional description"
              disabled={saving}
            />
          </Field>
        </div>
        <div className="action-row">
          <button className="primary-button" type="submit" disabled={saving}>
            {saving ? 'Saving...' : editing ? 'Save area' : 'Add area'}
          </button>
          {editing && (
            <button
              className="close-details"
              type="button"
              disabled={saving}
              onClick={() => {
                setEditing(undefined)
                setNotice(undefined)
              }}
            >
              Cancel edit
            </button>
          )}
        </div>
      </form>
      {notice && <Notice {...notice} />}
      {areas.length === 0 ? (
        <p className="issue-notice">No production areas yet.</p>
      ) : (
        <ul className="machine-list">
          {areas.map((area) => (
            <li className="machine-row" key={area.id}>
              <div>
                <strong>{area.name}</strong>
                {area.description && <small className="issue-area">{area.description}</small>}
              </div>
              <button
                type="button"
                className="close-details"
                aria-label={`Edit area ${area.name}`}
                onClick={() => {
                  setEditing(area)
                  setNotice(undefined)
                }}
              >
                Edit
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function SystemEditor({
  areas,
  systems,
  onReload,
}: {
  areas: ApiProductionArea[]
  systems: ApiMachineSystem[]
  onReload: () => Promise<void>
}) {
  const [editing, setEditing] = useState<ApiMachineSystem>()
  const [notice, setNotice] = useState<Message>()
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return

    const form = event.currentTarget
    const values = new FormData(form)
    const systemName = textValue(values, 'name')
    const description = textValue(values, 'description')
    const areaId = Number(values.get('area'))

    const error = !areas.some((area) => area.id === areaId)
      ? 'Select a production area.'
      : nameError(
          systemName,
          systems.filter((system) => system.areaId === areaId),
          editing?.id
        )

    if (error) return setNotice({ message: error, error: true })

    setSaving(true)
    setNotice(undefined)

    try {
      if (editing) {
        await updateSystem(editing.id, { areaId, systemName, description })
      } else {
        await createSystem({ areaId, systemName, description })
      }
      await onReload()
      form.reset()
      setNotice({ message: editing ? 'System updated.' : 'System added.' })
      setEditing(undefined)
    } catch (err) {
      setNotice({
        message: err instanceof Error ? err.message : 'Could not save machine system.',
        error: true,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="panel">
      <h3>Machine systems</h3>
      <form className="issue-form" key={editing?.id ?? 'new'} onSubmit={submit}>
        <div className="issue-form-row">
          <Field label="Production area">
            <select name="area" required defaultValue={editing?.areaId ?? ''} disabled={saving}>
              <option value="">Select an area</option>
              <AreaOptions areas={areas} />
            </select>
          </Field>
          <Field label="System name">
            <input name="name" required maxLength={100} defaultValue={editing?.name} disabled={saving} />
          </Field>
          <Field label="Description">
            <input
              name="description"
              maxLength={500}
              defaultValue={editing?.description}
              placeholder="Optional description"
              disabled={saving}
            />
          </Field>
        </div>
        <div className="action-row">
          <button className="primary-button" type="submit" disabled={!areas.length || saving}>
            {saving ? 'Saving...' : editing ? 'Save system' : 'Add system'}
          </button>
          {editing && (
            <button
              className="close-details"
              type="button"
              disabled={saving}
              onClick={() => {
                setEditing(undefined)
                setNotice(undefined)
              }}
            >
              Cancel edit
            </button>
          )}
        </div>
      </form>
      {notice && <Notice {...notice} />}
      {systems.length === 0 && (
        <p className="issue-notice">
          {areas.length ? 'No machine systems yet.' : 'Add a production area to create a system.'}
        </p>
      )}
      {areas.map((area) => {
        const areaSystems = systems.filter((system) => system.areaId === area.id)
        return (
          <section key={area.id} className="system-group">
            <h4>{area.name}</h4>
            {areaSystems.length === 0 ? (
              <p>No systems in this area.</p>
            ) : (
              <ul className="machine-list">
                {areaSystems.map((system) => (
                  <li className="machine-row" key={system.id}>
                    <div>
                      <strong>{system.name}</strong>
                      {system.description && <small className="issue-area">{system.description}</small>}
                    </div>
                    <button
                      type="button"
                      className="close-details"
                      aria-label={`Edit system ${system.name} in ${area.name}`}
                      onClick={() => {
                        setEditing(system)
                        setNotice(undefined)
                      }}
                    >
                      Edit
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}
    </section>
  )
}

function MachineEditor({
  areas,
  systems,
  machines,
  currentUserId,
  onReload,
}: {
  areas: ApiProductionArea[]
  systems: ApiMachineSystem[]
  machines: ApiAdminMachine[]
  currentUserId: number
  onReload: () => Promise<void>
}) {
  const [editing, setEditing] = useState<ApiAdminMachine>()
  const [areaId, setAreaId] = useState('')
  const [systemId, setSystemId] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [notice, setNotice] = useState<Message>()
  const [saving, setSaving] = useState(false)
  const [archivingId, setArchivingId] = useState<number | null>(null)

  const filteredSystems = systems.filter((system) => system.areaId === Number(areaId))
  const visibleMachines = machines.filter((machine) => machine.isArchived === showArchived)

  function selectMachine(machine?: ApiAdminMachine) {
    setEditing(machine)
    setAreaId(machine ? String(machine.areaId) : '')
    setSystemId(machine ? String(machine.systemId) : '')
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return

    const form = event.currentTarget
    const values = new FormData(form)
    const machineName = textValue(values, 'name')
    const location = textValue(values, 'location')
    const description = textValue(values, 'description')
    const status = values.get('status')
    const system = filteredSystems.find((item) => item.id === Number(systemId))

    const error = !system
      ? 'Select a system in the chosen area.'
      : nameError(
          machineName,
          machines.filter((machine) => machine.systemId === system.id),
          editing?.id
        )

    if (error || !system || !isOption(machineStatuses, status)) {
      setNotice({ message: error || 'Select a valid machine status.', error: true })
      return
    }

    setSaving(true)
    setNotice(undefined)

    try {
      if (editing) {
        await updateMachine(editing.id, {
          systemId: system.id,
          machineName,
          location,
          description,
          isArchived: editing.isArchived,
          status,
          changedByUserId: currentUserId,
        })
      } else {
        await createMachine({
          systemId: system.id,
          machineName,
          location,
          description,
          status,
          changedByUserId: currentUserId,
        })
      }

      await onReload()
      form.reset()
      setNotice({ message: editing ? 'Machine updated.' : 'Machine added.' })
      if (!editing) setShowArchived(false)
      selectMachine()
    } catch (err) {
      setNotice({
        message: err instanceof Error ? err.message : 'Could not save machine.',
        error: true,
      })
    } finally {
      setSaving(false)
    }
  }

  async function toggleArchive(machine: ApiAdminMachine) {
    if (archivingId) return
    const nextArchived = !machine.isArchived
    setArchivingId(machine.id)
    setNotice(undefined)

    try {
      await setMachineArchived(machine.id, nextArchived)
      await onReload()
      if (editing?.id === machine.id) selectMachine()
      setNotice({ message: nextArchived ? 'Machine archived.' : 'Machine restored.' })
    } catch (err) {
      setNotice({
        message: err instanceof Error ? err.message : 'Could not update archive status.',
        error: true,
      })
    } finally {
      setArchivingId(null)
    }
  }

  return (
    <section className="panel">
      <h3>{editing ? `Edit machine: ${editing.name}` : 'Machines'}</h3>
      <form className="issue-form" key={editing?.id ?? 'new'} onSubmit={submit}>
        <div className="issue-form-row">
          <Field label="Production area">
            <select
              name="area"
              required
              value={areaId}
              disabled={saving}
              onChange={(event) => {
                setAreaId(event.target.value)
                setSystemId('')
              }}
            >
              <option value="">Select an area</option>
              <AreaOptions areas={areas} />
            </select>
          </Field>
          <Field label="Machine system">
            <select
              name="system"
              required
              value={systemId}
              disabled={!filteredSystems.length || saving}
              onChange={(event) => setSystemId(event.target.value)}
            >
              <option value="">
                {!areaId
                  ? 'Select an area first'
                  : filteredSystems.length
                  ? 'Select a system'
                  : 'No systems in this area'}
              </option>
              {filteredSystems.map((system) => (
                <option key={system.id} value={system.id}>
                  {system.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="issue-form-row">
          <Field label="Machine name">
            <input name="name" required maxLength={100} defaultValue={editing?.name} disabled={saving} />
          </Field>
          <Field label="Location">
            <input
              name="location"
              required
              maxLength={255}
              defaultValue={editing?.location}
              placeholder="e.g., Body B1 / Cell 03"
              disabled={saving}
            />
          </Field>
          <Field label="Operating status">
            <select name="status" defaultValue={editing?.status ?? 'Operational'} disabled={saving}>
              <Options values={machineStatuses} />
            </select>
          </Field>
        </div>
        <Field label="Description">
          <input
            name="description"
            maxLength={500}
            defaultValue={editing?.description}
            placeholder="Optional equipment description"
            disabled={saving}
          />
        </Field>
        <div className="action-row">
          <button className="primary-button" type="submit" disabled={!systems.length || saving}>
            {saving ? 'Saving...' : editing ? 'Save machine' : 'Add machine'}
          </button>
          {editing && (
            <button
              className="close-details"
              type="button"
              disabled={saving}
              onClick={() => {
                selectMachine()
                setNotice(undefined)
              }}
            >
              Cancel edit
            </button>
          )}
        </div>
      </form>
      {notice && <Notice {...notice} />}
      <div className="equipment-toolbar">
        <Field label="Machine list">
          <select
            value={showArchived ? 'archived' : 'active'}
            onChange={(event) => setShowArchived(event.target.value === 'archived')}
          >
            <option value="active">
              Active machines ({machines.filter((machine) => !machine.isArchived).length})
            </option>
            <option value="archived">
              Archived machines ({machines.filter((machine) => machine.isArchived).length})
            </option>
          </select>
        </Field>
      </div>
      <ScrollTable label={showArchived ? 'Archived machines' : 'Active machines'}>
        <thead>
          <tr>
            <th scope="col">Machine</th>
            <th scope="col">Area / system</th>
            <th scope="col">Location</th>
            <th scope="col">Operating status</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {visibleMachines.length === 0 && (
            <tr>
              <td className="empty-state" colSpan={5}>
                {showArchived ? 'No archived machines.' : 'No active machines.'}
              </td>
            </tr>
          )}
          {visibleMachines.map((machine) => (
            <tr key={machine.id}>
              <th scope="row">
                <div>{machine.name}</div>
                {machine.description && <small className="issue-area">{machine.description}</small>}
              </th>
              <td>
                {machine.areaName} / {machine.systemName}
              </td>
              <td>{machine.location || 'Unspecified'}</td>
              <td>
                <MachineBadge status={machine.status} />
              </td>
              <td>
                <div className="action-row">
                  <button
                    type="button"
                    className="close-details"
                    aria-label={`Edit machine ${machine.name}`}
                    disabled={archivingId === machine.id}
                    onClick={() => {
                      selectMachine(machine)
                      setNotice(undefined)
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="close-details"
                    aria-label={`${showArchived ? 'Restore' : 'Archive'} machine ${machine.name}`}
                    disabled={archivingId === machine.id}
                    onClick={() => toggleArchive(machine)}
                  >
                    {showArchived ? 'Restore' : 'Archive'}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </ScrollTable>
    </section>
  )
}

export default function AdministrationPage({ currentUserId, onChanged }: Props) {
  const [areas, setAreas] = useState<ApiProductionArea[]>([])
  const [systems, setSystems] = useState<ApiMachineSystem[]>([])
  const [machines, setMachines] = useState<ApiAdminMachine[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  async function reload() {
    const adminData = await getAdminData()
    setAreas(adminData.areas)
    setSystems(adminData.systems)
    setMachines(adminData.machines)
    onChanged?.()
  }

  useEffect(() => {
    let ignore = false

    async function init() {
      try {
        setLoading(true)
        const adminData = await getAdminData()
        if (!ignore) {
          setAreas(adminData.areas)
          setSystems(adminData.systems)
          setMachines(adminData.machines)
        }
      } catch (err) {
        if (!ignore) {
          setLoadError(err instanceof Error ? err.message : 'Could not load administration data.')
        }
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    init()
    return () => {
      ignore = true
    }
  }, [])

  if (loading) {
    return (
      <section className="panel">
        <p role="status">Loading administration data...</p>
      </section>
    )
  }

  if (loadError) {
    return (
      <section className="panel">
        <Notice message={loadError} error />
      </section>
    )
  }

  return (
    <div className="issues-layout">
      <AreaEditor areas={areas} onReload={reload} />
      <SystemEditor areas={areas} systems={systems} onReload={reload} />
      <MachineEditor
        areas={areas}
        systems={systems}
        machines={machines}
        currentUserId={currentUserId}
        onReload={reload}
      />
    </div>
  )
}