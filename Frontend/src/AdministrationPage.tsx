import { useState } from 'react'
import type { FormEvent } from 'react'
import { Field, MachineBadge, Notice, Options, ScrollTable } from './EquipmentUi'
import { nextId, upsert } from './frontendData'
import { isOption, machineStatuses } from './models'
import type { ChangeData, DemoData, LinkedMachine, MachineSystem, ProductionArea } from './models'

type Props = { data: DemoData; machines: LinkedMachine[]; changeData: ChangeData }
type Message = { message: string; error?: boolean }

function textValue(form: FormData, field: string) {
  return String(form.get(field) ?? '').trim()
}

function nameError(name: string, records: { id: number; name: string }[], editingId?: number) {
  if (!name) return 'Enter a name.'
  if (records.some((item) => item.id !== editingId &&
    item.name.trim().toLowerCase() === name.toLowerCase())) return 'This name is already in use here.'
  return ''
}

function AreaOptions({ areas }: { areas: ProductionArea[] }) {
  return areas.map(({ id, name }) => <option key={id} value={id}>{name}</option>)
}

function AreaEditor({ data, changeData }: Pick<Props, 'data' | 'changeData'>) {
  const [editing, setEditing] = useState<ProductionArea>()
  const [notice, setNotice] = useState<Message>()

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const name = textValue(new FormData(form), 'name')
    const error = nameError(name, data.areas, editing?.id)
    if (error) return setNotice({ message: error, error: true })
    const id = editing?.id ?? nextId(data.areas.map((area) => area.id))
    if (changeData((current) => ({ ...current, areas: upsert(current.areas, { id, name }) }))) {
      form.reset()
      setNotice({ message: editing ? 'Area updated.' : 'Area added.' })
      setEditing(undefined)
    } else setNotice(undefined)
  }

  return <section className="panel">
    <h3>Production areas</h3>
    <form className="issue-form" key={editing?.id ?? 'new'} onSubmit={submit}>
      <Field label="Area name">
        <input name="name" required maxLength={100} defaultValue={editing?.name} />
      </Field>
      <div className="action-row">
        <button className="primary-button" type="submit">{editing ? 'Save area' : 'Add area'}</button>
        {editing && <button className="close-details" type="button" onClick={() => {
          setEditing(undefined)
          setNotice(undefined)
        }}>Cancel edit</button>}
      </div>
    </form>
    {notice && <Notice {...notice} />}
    {data.areas.length === 0 ? <p className="issue-notice">No production areas yet.</p> :
      <ul className="machine-list">{data.areas.map((area) =>
        <li className="machine-row" key={area.id}>
          <strong>{area.name}</strong>
          <button type="button" className="close-details" aria-label={`Edit area ${area.name}`} onClick={() => {
            setEditing(area)
            setNotice(undefined)
          }}>Edit</button>
        </li>)}</ul>}
  </section>
}

function SystemEditor({ data, changeData }: Pick<Props, 'data' | 'changeData'>) {
  const [editing, setEditing] = useState<MachineSystem>()
  const [notice, setNotice] = useState<Message>()

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const values = new FormData(form)
    const name = textValue(values, 'name')
    const areaId = Number(values.get('area'))
    const error = !data.areas.some((area) => area.id === areaId)
      ? 'Select a production area.'
      : nameError(name, data.systems.filter((system) => system.areaId === areaId), editing?.id)
    if (error) return setNotice({ message: error, error: true })
    const id = editing?.id ?? nextId(data.systems.map((system) => system.id))
    if (changeData((current) => ({ ...current, systems: upsert(current.systems, { id, name, areaId }) }))) {
      form.reset()
      setNotice({ message: editing ? 'System updated.' : 'System added.' })
      setEditing(undefined)
    } else setNotice(undefined)
  }

  return <section className="panel">
    <h3>Machine systems</h3>
    <form className="issue-form" key={editing?.id ?? 'new'} onSubmit={submit}>
      <div className="issue-form-row">
        <Field label="Production area">
          <select name="area" required defaultValue={editing?.areaId ?? ''}>
            <option value="">Select an area</option>
            <AreaOptions areas={data.areas} />
          </select>
        </Field>
        <Field label="System name">
          <input name="name" required maxLength={100} defaultValue={editing?.name} />
        </Field>
      </div>
      <div className="action-row">
        <button className="primary-button" type="submit" disabled={!data.areas.length}>
          {editing ? 'Save system' : 'Add system'}
        </button>
        {editing && <button className="close-details" type="button" onClick={() => {
          setEditing(undefined)
          setNotice(undefined)
        }}>Cancel edit</button>}
      </div>
    </form>
    {notice && <Notice {...notice} />}
    {data.systems.length === 0 && <p className="issue-notice">
      {data.areas.length ? 'No machine systems yet.' : 'Add a production area to create a system.'}
    </p>}
    {data.areas.map((area) => {
      const systems = data.systems.filter((system) => system.areaId === area.id)
      return <section key={area.id} className="system-group">
        <h4>{area.name}</h4>
        {systems.length === 0 ? <p>No systems in this area.</p> :
          <ul className="machine-list">{systems.map((system) =>
            <li className="machine-row" key={system.id}>
              <strong>{system.name}</strong>
              <button type="button" className="close-details" aria-label={`Edit system ${system.name} in ${area.name}`}
                onClick={() => {
                  setEditing(system)
                  setNotice(undefined)
                }}>Edit</button>
            </li>)}</ul>}
      </section>
    })}
  </section>
}

function MachineEditor({ data, machines, changeData }: Props) {
  const [editing, setEditing] = useState<LinkedMachine>()
  const [areaId, setAreaId] = useState('')
  const [systemId, setSystemId] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [notice, setNotice] = useState<Message>()
  const systems = data.systems.filter((system) => system.areaId === Number(areaId))
  const visibleMachines = machines.filter((machine) => machine.isArchived === showArchived)

  function selectMachine(machine?: LinkedMachine) {
    setEditing(machine)
    setAreaId(machine ? String(machine.areaId) : '')
    setSystemId(machine ? String(machine.systemId) : '')
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const values = new FormData(form)
    const name = textValue(values, 'name')
    const location = textValue(values, 'location')
    const status = values.get('status')
    const system = systems.find((item) => item.id === Number(systemId))
    const error = !system ? 'Select a system in the chosen area.' :
      nameError(name, machines.filter((machine) => machine.systemId === system.id), editing?.id)
    if (error || !system || !isOption(machineStatuses, status)) {
      setNotice({ message: error || 'Select a valid machine status.', error: true })
      return
    }

    const id = editing?.id ?? nextId([
      ...data.machines.map((machine) => machine.id),
      ...data.issues.map((issue) => issue.machineId),
      ...data.tasks.map((task) => task.machineId),
    ])
    const machine = { id, name, systemId: system.id, location, status, isArchived: editing?.isArchived ?? false }
    if (changeData((current) => ({ ...current, machines: upsert(current.machines, machine) }))) {
      form.reset()
      setNotice({ message: editing ? 'Machine updated.' : 'Machine added.' })
      if (!editing) setShowArchived(false)
      selectMachine()
    } else setNotice(undefined)
  }

  function toggleArchive(machine: LinkedMachine) {
    const isArchived = !machine.isArchived
    if (changeData((current) => ({
      ...current,
      machines: current.machines.map((item) => item.id === machine.id ? { ...item, isArchived } : item),
    }))) {
      if (editing?.id === machine.id) selectMachine()
      setNotice({ message: isArchived ? 'Machine archived.' : 'Machine restored.' })
    } else setNotice(undefined)
  }

  return <section className="panel">
    <h3>{editing ? `Edit machine: ${editing.name}` : 'Machines'}</h3>
    <form className="issue-form" key={editing?.id ?? 'new'} onSubmit={submit}>
      <div className="issue-form-row">
        <Field label="Production area">
          <select name="area" required value={areaId} onChange={(event) => {
            setAreaId(event.target.value)
            setSystemId('')
          }}>
            <option value="">Select an area</option>
            <AreaOptions areas={data.areas} />
          </select>
        </Field>
        <Field label="Machine system">
          <select name="system" required value={systemId} disabled={!systems.length}
            onChange={(event) => setSystemId(event.target.value)}>
            <option value="">{!areaId ? 'Select an area first' : systems.length ? 'Select a system' : 'No systems in this area'}</option>
            {systems.map((system) => <option key={system.id} value={system.id}>{system.name}</option>)}
          </select>
        </Field>
      </div>
      <div className="issue-form-row">
        <Field label="Machine name"><input name="name" required maxLength={100} defaultValue={editing?.name} /></Field>
        <Field label="Location"><input name="location" maxLength={255} defaultValue={editing?.location} /></Field>
        <Field label="Operating status">
          <select name="status" defaultValue={editing?.status ?? 'Operational'}><Options values={machineStatuses} /></select>
        </Field>
      </div>
      <div className="action-row">
        <button className="primary-button" type="submit" disabled={!data.systems.length}>
          {editing ? 'Save machine' : 'Add machine'}
        </button>
        {editing && <button className="close-details" type="button" onClick={() => {
          selectMachine()
          setNotice(undefined)
        }}>Cancel edit</button>}
      </div>
    </form>
    {notice && <Notice {...notice} />}
    <div className="equipment-toolbar">
      <Field label="Machine list">
        <select value={showArchived ? 'archived' : 'active'}
          onChange={(event) => setShowArchived(event.target.value === 'archived')}>
          <option value="active">Active machines ({machines.length - machines.filter((machine) => machine.isArchived).length})</option>
          <option value="archived">Archived machines ({machines.filter((machine) => machine.isArchived).length})</option>
        </select>
      </Field>
    </div>
    <ScrollTable label={showArchived ? 'Archived machines' : 'Active machines'}>
      <thead><tr>
        <th scope="col">Machine</th><th scope="col">Area / system</th><th scope="col">Location</th>
        <th scope="col">Operating status</th><th scope="col">Actions</th>
      </tr></thead>
      <tbody>
        {visibleMachines.length === 0 && <tr><td className="empty-state" colSpan={5}>
          {showArchived ? 'No archived machines.' : 'No active machines.'}
        </td></tr>}
        {visibleMachines.map((machine) => <tr key={machine.id}>
          <th scope="row">{machine.name}</th>
          <td>{machine.areaName} / {machine.systemName}</td>
          <td>{machine.location || 'Unspecified'}</td>
          <td><MachineBadge status={machine.status} /></td>
          <td><div className="action-row">
            <button type="button" className="close-details" aria-label={`Edit machine ${machine.name}`}
              onClick={() => { selectMachine(machine); setNotice(undefined) }}>Edit</button>
            <button type="button" className="close-details"
              aria-label={`${showArchived ? 'Restore' : 'Archive'} machine ${machine.name}`}
              onClick={() => toggleArchive(machine)}>{showArchived ? 'Restore' : 'Archive'}</button>
          </div></td>
        </tr>)}
      </tbody>
    </ScrollTable>
  </section>
}

export default function AdministrationPage(props: Props) {
  return <div className="issues-layout">
    <AreaEditor data={props.data} changeData={props.changeData} />
    <SystemEditor data={props.data} changeData={props.changeData} />
    <MachineEditor {...props} />
  </div>
}
