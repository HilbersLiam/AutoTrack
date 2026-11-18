# AutoTrack frontend

Run `npm install` and `npm run dev`. Verify with `npm run build`, `npm run lint`, and `node --test frontendData.test.mjs` on Node 24.

## Features

- Overview and Equipment show the area, system, and machine hierarchy. Browse, search, filter, and update equipment status.
- Administration manages areas, systems, and machines, including archive and restore.
- Issues and Maintenance track work against machines. Reports summarize active equipment, unresolved issues, and maintenance.

## Demo storage

`src/frontendData.ts` reads the four legacy `autotrack-*-v1` keys and saves a normalized version 2 snapshot in `autotrack-demo-v2`. The legacy keys remain as a recovery copy. Every legacy area gets a Default system, including empty areas. Saved area snapshots take precedence for machine statuses they contain. Older status-only installations apply the status map to the original demo machines. Machine IDs and work record IDs carry forward. Archived machines still resolve issue and task references. Work with an unavailable machine is kept and displays its machine ID.

Dates selected in the demo are local calendar dates. A task due today becomes overdue after local midnight if it is still Scheduled or In Progress. New event timestamps are ISO instants rendered in local time. Legacy records without creation, resolution, or completion timestamps leave those fields unknown. The two technician options are fictional fixtures from the repository's SQL sample. The SQL accounts are inactive, and the options exist solely to exercise the demo assignment workflow.

## Backend handoff

Use the frontend models in `src/models.ts` and replace the browser bootstrap/save adapter with API reads and mutations. The field names and enum values below were verified against `../Backend/MySQL/autotrack_tables.sql`. Keep mapping at the API boundary so components can continue to use the same relational data.

| Frontend | Database mapping |
| --- | --- |
| Area `id, name` | `ProductionArea.AreaID, AreaName` |
| System `id, areaId, name` | `MachineSystem.SystemID, AreaID, SystemName` |
| Machine `id, systemId, name, location, isArchived` | `Machine.MachineID, SystemID, MachineName, Location, IsArchived` |
| Machine `status` | Latest `MachineStatusHistory.Status` ordered by `ChangedAt` and then `StatusHistoryID` |
| Issue `id, machineId, description, priority, status, createdAt, resolvedAt` | `IssueReport.IssueID, MachineID, Description, Priority, IssueStatus, ReportedAt, ResolvedAt` |
| Task `id, machineId, description, assignedTechnicianId, createdAt, dueDate, status, completedAt, workPerformed` | `MaintenanceTask.TaskID, MachineID, TaskDescription, AssignedTechnicianID, CreatedAt, DueAt, TaskStatus, CompletedAt, WorkPerformed` |
| Technician picker | `UserAccount.UserID, FullName`, filtered to eligible active technicians |

The UI uses the schema enum strings directly. Machine statuses are Operational, Down, and Under Maintenance. Issue statuses are Open, In Progress, and Resolved, with Low, Medium, and High priorities. Task statuses are Scheduled, In Progress, Completed, and Cancelled.

Reports count Open and In Progress issues as unresolved. Outstanding maintenance includes Scheduled and In Progress tasks and excludes Completed and Cancelled tasks.

- Read the area, system, and machine lists with archived rows available for historical links and Administration. Return the current operating status with each machine. Load issues and maintenance tasks alongside them, or keep their API cache synchronized after mutations.
- Create and update areas, systems, and machines. Archive and restore via `IsArchived`. Preserve IDs during moves. Keep duplicate-name and parent validation on the server. SQL also requires description fields for areas, systems, and machines. Agree on a server default for the demo forms or expose description inputs when integrating.
- Append machine status history on a status change, using the signed-in actor for `ChangedByUserID`. If machine edits and a status change are submitted together, persist them as one operation.
- Create issues and apply status transitions with `ReportedByUserID` and `ResolvedAt`. Create and update tasks with technician assignment, work notes, and completion time. The server supplies `CreatedByUserID`, `LastUpdatedByUserID`, and audit timestamps. Clear completion on reopen. `IssueID` on a maintenance task is optional and currently unset by the demo.
- Use database-generated numeric IDs for new API records. Existing demo issue/task IDs are strings, including legacy UUIDs. A future import would need an explicit ID mapping. Decode `IsArchived` as a boolean and agree on the plant timezone and local end-of-day conversion for date-only tasks before mapping them to `DueAt`.
- Return validation and persistence errors to the calling form. The demo's synchronous success result should become an awaited API result. Derive reports from the same current dataset or return server aggregates with the same definitions. Active-machine counts exclude archives, and work record counts include archived machine history.
