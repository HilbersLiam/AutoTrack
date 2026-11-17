import type { ReactNode } from 'react'
import type { LinkedMachine, MachineStatus } from './models'

const badgeClasses = {
  Operational: 'status-operational',
  Down: 'status-down',
  'Under Maintenance': 'status-maintenance',
}

export function MachineBadge({ status }: { status: MachineStatus }) {
  return <span className={`status-badge ${badgeClasses[status]}`}>{status}</span>
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="filter-field"><span className="field-label">{label}</span>{children}</label>
}

export function Options({ values }: { values: readonly string[] }) {
  return values.map((value) => <option key={value}>{value}</option>)
}

export function MachineOptions({ machines }: { machines: LinkedMachine[] }) {
  return machines.map((machine) => (
    <option key={machine.id} value={machine.id}>
      {machine.areaName} / {machine.systemName} / {machine.name}
    </option>
  ))
}

export function MachineReference({ machine, id }: { machine?: LinkedMachine; id: number }) {
  return <>
    <strong>{machine?.name ?? `Machine #${id} (unavailable)`}</strong>
    {machine && <small className="issue-area">
      {machine.areaName} / {machine.systemName}{machine.isArchived && ' / Archived'}
    </small>}
  </>
}

export function ScrollTable({ label, children }: { label: string; children: ReactNode }) {
  return <div className="table-container" tabIndex={0} role="region" aria-label={label}>
    <table className="equipment-table">
      <caption className="visually-hidden">{label}</caption>
      {children}
    </table>
  </div>
}

export function Notice({ message, error = false }: { message: string; error?: boolean }) {
  return <p className={`issue-notice${error ? ' issue-error' : ''}`} role={error ? 'alert' : 'status'}>
    {message}
  </p>
}
