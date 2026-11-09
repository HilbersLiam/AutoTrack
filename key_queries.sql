-- AutoTrack: Key Queries

-- QUERY 1: Retrieve all active machines
-- Purpose: Display machines and their current status.

SELECT m.MachineID, m.MachineName, m.Location,
    (
    SELECT msh.Status
    FROM MachineStatusHistory msh
    WHERE msh.MachineID = m.MachineID
    ORDER BY msh.ChangedAt DESC, msh.StatusHistoryID DESC
    LIMIT 1
    ) AS CurrentStatus
FROM Machine m
WHERE m.IsArchived = FALSE;

-- QUERY 2: Retrieve unresolved issues
-- Purpose: Display issues requiring attention.

SELECT ir.IssueID, ir.MachineID, m.MachineName, ir.Description, ir.Priority, ir.IssueStatus, ir.ReportedAt
FROM IssueReport ir
JOIN Machine m
    ON ir.MachineID = m.MachineID

WHERE ir.IssueStatus IN ('Open', 'In Progress')
ORDER BY ir.ReportedAt ASC;

-- QUERY 3: Retrieve machines history
-- Purpose: Display a machines history

SELECT mt.TaskID, m.MachineName, mt.TaskDescription, mt.TaskStatus, ua.FullName AS AssignedTechnician, mt.CreatedAt, mt.CompletedAt, mt.WorkPerformed
FROM MaintenanceTask mt
JOIN Machine m
    ON mt.MachineID = m.MachineID
LEFT JOIN UserAccount ua 
    ON mt.AssignedTechnicianID = ua.UserID

ORDER BY mt.CreatedAt DESC;

-- QUERY 4: Retrieve user accounts
-- Purpose: Display user accounts and their roles

SELECT UserID, FullName, Email, UserRole, IsActive
FROM UserAccount
ORDER BY UserRole, FullName;

-- QUERY 5: Retrieve issues grouped by prod area and priority
-- Purpose: ^^
SELECT pa.AreaName, ir.Priority, COUNT(ir.IssueID) AS TotalIssues
FROM IssueReport ir
JOIN Machine m
    ON ir.MachineID = m.MachineID

JOIN MachineSystem ms
    ON m.SystemID = ms.SystemID

JOIN ProductionArea pa
    ON ms.AreaID = pa.AreaID

WHERE ir.IssueStatus IN ('Open', 'In Progress')
GROUP BY pa.AreaID, pa.AreaName, ir.Priority
ORDER BY pa.AreaName,
    CASE ir.Priority
        WHEN 'High' THEN 1
        WHEN 'Medium' THEN 2
        WHEN 'Low' THEN 3
    END;

-- QUERY 6: Retrieve all maintnance tasks that still need do be done

SELECT mt.TaskID, m.MachineName, mt.TaskDescription, ua.FullName AS AssignedTechnician, mt.DueAt, mt.TaskStatus
FROM MaintenanceTask mt

JOIN Machine m
    ON mt.MachineID = m.MachineID

LEFT JOIN UserAccount ua
    ON mt.AssignedTechnicianID = ua.UserID

WHERE mt.TaskStatus NOT IN ('Completed', 'Cancelled')
ORDER BY mt.DueAt ASC;