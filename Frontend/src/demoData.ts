import type { LegacyArea } from './models.ts'
export const demoAreas: LegacyArea[] = [
  {
    id: 1,
    name: 'Chassis 4',
    machines: [
      { id: 1, name: 'Conveyor 01', status: 'Operational' },
      { id: 2, name: 'Conveyor 02', status: 'Down' },
      { id: 3, name: 'Weld cell 01', status: 'Operational' },
    ],
  },
  {
    id: 2,
    name: 'Trim',
    machines: [
      { id: 4, name: 'Trim station 01', status: 'Operational' },
      { id: 5, name: 'Lift 03', status: 'Under Maintenance' },
      { id: 6, name: 'Trim station 02', status: 'Operational' },
    ],
  },
  {
    id: 3,
    name: 'Body shop',
    machines: [
      { id: 7, name: 'Robot arm 05', status: 'Operational' },
      { id: 8, name: 'Robot arm 07', status: 'Down' },
      { id: 9, name: 'Paint booth 01', status: 'Operational' },
    ],
  },
]



// Fictional technician fixtures from Backend/MySQL/sample_data.sql.
export const demoTechnicians = [
  { id: 6, name: 'Priya Shah' },
  { id: 8, name: 'Taylor Brooks' },
]
