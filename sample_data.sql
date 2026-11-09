-- AutoTrack - Sample/Test Data
-- Database: AutoTrack


USE `AutoTrack`;

START TRANSACTION;


INSERT INTO `UserAccount` (`UserID`, `FullName`, `Email`, `Password`, `UserRole`, `IsActive`) VALUES
    (5,'Alex Morgan','test-user-1@example.invalid','!LOGIN-DISABLED!','Operator',0),
    (6,'Priya Shah','test-user-2@example.invalid','!LOGIN-DISABLED!','Technician',0),
    (7,'Jordan Chen','test-user-3@example.invalid','!LOGIN-DISABLED!','Supervisor',0),
    (8,'Taylor Brooks','test-user-4@example.invalid','!LOGIN-DISABLED!','Technician',0);


INSERT INTO `ProductionArea` (`AreaID`, `AreaName`, `Description`) VALUES
    (5,'Body Shop','Automotive plant production area: Body Shop.'),
    (6,'Paint Shop','Automotive plant production area: Paint Shop.'),
    (7,'Final Assembly','Automotive plant production area: Final Assembly.'),
    (8,'Future EV Expansion','Automotive plant production area reserved for future EV expansion.');


INSERT INTO `MachineSystem` (`SystemID`, `AreaID`, `SystemName`, `Description`) VALUES
    (5,5,'Robotic Welding','Robotic welding system.'),
    (6,6,'Paint Delivery','Paint delivery system.'),
    (7,7,'End-of-Line Testing','End-of-line testing system.'),
    (8,7,'Reserved Conveyor Cell','Reserved conveyor cell system.');


INSERT INTO `Machine` (`MachineID`, `SystemID`, `MachineName`, `Location`, `Description`, `IsArchived`) VALUES
    (7,5,'Weld Robot WR-101','Body B1 / Cell 01','Automotive equipment fixture.',0),
    (8,5,'Weld Robot WR-102','Body B1 / Cell 02','Automotive equipment fixture.',0),
    (9,6,'Paint Pump PP-201','Paint P2 / Pump Room','Automotive equipment fixture.',0),
    (10,7,'Brake Tester BT-301','Assembly A3 / EOL','Automotive equipment fixture.',0),
    (11,7,'Vision Station VS-302','Assembly A3 / Inspection','Automotive equipment fixture.',0),
    (12,5,'Retired Weld Robot WR-099','Body B1 / Storage','Automotive equipment fixture.',1);


INSERT INTO `MachineStatusHistory` (`StatusHistoryID`, `MachineID`, `ChangedByUserID`, `Status`, `ChangedAt`) VALUES
    (8,7,5,'Operational','2026-10-30 06:00:00'),
    (9,7,5,'Down','2026-11-01 09:00:00'),
    (10,7,6,'Under Maintenance','2026-11-01 10:00:00'),
    (11,7,6,'Operational','2026-11-01 13:00:00'),
    (12,8,5,'Down','2026-11-04 08:00:00'),
    (13,9,6,'Under Maintenance','2026-11-04 10:00:00'),
    (14,10,5,'Operational','2026-11-04 06:00:00');


INSERT INTO `IssueReport` (`IssueID`, `MachineID`, `ReportedByUserID`, `Description`, `Priority`, `IssueStatus`, `ReportedAt`, `ResolvedAt`) VALUES
    (5,7,5,'Electrode wear causing weak welds','High','Resolved','2026-11-01 09:05:00','2026-11-01 13:00:00'),
    (6,8,5,'Servo overload stops weld cycle','High','Open','2026-11-04 08:05:00',NULL),
    (7,9,5,'Paint pump seal leaking','Medium','In Progress','2026-11-04 09:00:00',NULL),
    (8,10,5,'Brake tester display flicker','Low','Open','2026-11-03 14:00:00',NULL);


INSERT INTO `MaintenanceTask` (`TaskID`, `MachineID`, `IssueID`, `AssignedTechnicianID`, `CreatedByUserID`, `LastUpdatedByUserID`, `TaskDescription`, `TaskStatus`, `CreatedAt`, `DueAt`, `CompletedAt`, `WorkPerformed`, `LastUpdatedAt`) VALUES
    (1,7,5,6,7,6,'Replace worn electrode tips','Completed','2026-11-01 09:30:00','2026-11-01 14:00:00','2026-11-01 12:50:00','Replaced two tips, verified weld coupons.','2026-11-01 12:50:00'),
    (2,8,6,NULL,7,7,'Diagnose weld servo overload','Scheduled','2026-11-04 08:30:00','2026-11-04 18:00:00',NULL,NULL,'2026-11-04 08:30:00'),
    (3,9,7,6,7,6,'Replace paint pump seal','In Progress','2026-11-04 09:30:00','2026-11-06 18:00:00',NULL,'Isolated pump, removed worn seal.','2026-11-04 09:30:00'),
    (4,10,NULL,6,7,6,'Quarterly brake tester bearing service','Scheduled','2026-11-02 07:00:00','2026-12-01 07:00:00',NULL,NULL,'2026-11-02 07:00:00'),
    (5,10,NULL,NULL,7,7,'Duplicate calibration request','Cancelled','2026-11-02 08:00:00','2026-11-08 12:00:00',NULL,'Cancelled duplicate request, no parts used.','2026-11-02 08:00:00'),
    (6,7,NULL,6,7,6,'Preventive weld cell bearing inspection','Completed','2026-10-30 07:00:00','2026-10-31 16:00:00','2026-10-30 11:00:00','Replaced bearing and verified alignment.','2026-10-30 11:00:00');


INSERT INTO `Part` (`PartID`, `PartNumber`, `PartName`, `Description`) VALUES
    (5,'BEARING-6205','Conveyor bearing 6205','Maintenance spare part.'),
    (6,'SEAL-PTFE-25','Paint pump PTFE seal','Maintenance spare part.'),
    (7,'TIP-CU-08','Copper weld electrode tip','Maintenance spare part.'),
    (8,'SENSOR-M12','Inductive proximity sensor','Maintenance spare part.');

INSERT INTO `MaintenanceTaskPart` (`TaskID`, `PartID`, `QuantityUsed`) VALUES
    (1,5,1),
    (1,7,2),
    (3,6,1),
    (6,5,1);

COMMIT;

