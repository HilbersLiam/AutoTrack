-- AutoTrack - Database Table Definitions
-- Database: AutoTrack
-- This file creates the nine tables, keys, indexes, and constraints.

USE `AutoTrack`;

CREATE TABLE `UserAccount` (
    `UserID` int NOT NULL AUTO_INCREMENT,
    `FullName` varchar(50) NOT NULL,
    `Email` varchar(254) NOT NULL,
    `Password` varchar(255) NOT NULL,
    `UserRole` varchar(100) DEFAULT NULL,
    `IsActive` tinyint(1) DEFAULT '1',
    PRIMARY KEY (`UserID`),
    UNIQUE KEY `Email` (`Email`)
)

CREATE TABLE `ProductionArea` (
    `AreaID` int NOT NULL AUTO_INCREMENT,
    `AreaName` varchar(100) NOT NULL,
    `Description` text NOT NULL,
    PRIMARY KEY (`AreaID`),
    UNIQUE KEY `AreaName` (`AreaName`)
)

CREATE TABLE `MachineSystem` (
    `SystemID` int NOT NULL AUTO_INCREMENT,
    `AreaID` int NOT NULL,
    `SystemName` varchar(100) NOT NULL,
    `Description` text NOT NULL,
    PRIMARY KEY (`SystemID`),
    UNIQUE KEY `UQ_Area_SystemName` (`AreaID`,`SystemName`),
    CONSTRAINT `FK_MachineSystem_Area` FOREIGN KEY (`AreaID`) REFERENCES `ProductionArea` (`AreaID`)
) 

CREATE TABLE `Machine` (
    `MachineID` int NOT NULL AUTO_INCREMENT,
    `SystemID` int NOT NULL,
    `MachineName` varchar(100) NOT NULL,
    `Location` varchar(255) NOT NULL,
    `Description` text NOT NULL,
    `IsArchived` tinyint(1) NOT NULL DEFAULT '0',
    PRIMARY KEY (`MachineID`),
    KEY `FK_Machine_System` (`SystemID`),
    CONSTRAINT `FK_Machine_System` FOREIGN KEY (`SystemID`) REFERENCES `MachineSystem` (`SystemID`)
) 

CREATE TABLE `MachineStatusHistory` (
    `StatusHistoryID` int NOT NULL AUTO_INCREMENT,
    `MachineID` int NOT NULL,
    `ChangedByUserID` int NOT NULL,
    `Status` enum('Operational','Down','Under Maintenance') NOT NULL,
    `ChangedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`StatusHistoryID`),
    KEY `FK_StatusHistory_Machine` (`MachineID`),
    KEY `FK_StatusHistory_User` (`ChangedByUserID`),
    CONSTRAINT `FK_StatusHistory_Machine` FOREIGN KEY (`MachineID`) REFERENCES `Machine` (`MachineID`),
    CONSTRAINT `FK_StatusHistory_User` FOREIGN KEY (`ChangedByUserID`) REFERENCES `UserAccount` (`UserID`)
)

CREATE TABLE `IssueReport` (
    `IssueID` int NOT NULL AUTO_INCREMENT,
    `MachineID` int NOT NULL,
    `ReportedByUserID` int NOT NULL,
    `Description` text NOT NULL,
    `Priority` enum('Low','Medium','High') NOT NULL,
    `IssueStatus` enum('Open','In Progress','Resolved') NOT NULL DEFAULT 'Open',
    `ReportedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `ResolvedAt` datetime DEFAULT NULL,
    PRIMARY KEY (`IssueID`),
    KEY `FK_Issue_Machine` (`MachineID`),
    KEY `FK_Issue_User` (`ReportedByUserID`),
    CONSTRAINT `FK_Issue_Machine` FOREIGN KEY (`MachineID`) REFERENCES `Machine` (`MachineID`),
    CONSTRAINT `FK_Issue_User` FOREIGN KEY (`ReportedByUserID`) REFERENCES `UserAccount` (`UserID`),
    CONSTRAINT `CHK_Issue_ResolvedAt` CHECK (((`ResolvedAt` is null) or (`ResolvedAt` >= `ReportedAt`)))
    )

CREATE TABLE `MaintenanceTask` (
    `TaskID` int NOT NULL AUTO_INCREMENT,
    `MachineID` int NOT NULL,
    `IssueID` int DEFAULT NULL,
    `AssignedTechnicianID` int DEFAULT NULL,
    `CreatedByUserID` int NOT NULL,
    `LastUpdatedByUserID` int NOT NULL,
    `TaskDescription` text NOT NULL,
    `TaskStatus` enum('Scheduled','In Progress','Completed','Cancelled') NOT NULL DEFAULT 'Scheduled',
    `CreatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `DueAt` datetime NOT NULL,
    `CompletedAt` datetime DEFAULT NULL,
    `WorkPerformed` text,
    `LastUpdatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`TaskID`),
    KEY `FK_Task_Machine` (`MachineID`),
    KEY `FK_Task_Issue` (`IssueID`),
    KEY `FK_Task_Technician` (`AssignedTechnicianID`),
    KEY `FK_Task_CreatedBy` (`CreatedByUserID`),
    KEY `FK_Task_LastUpdatedBy` (`LastUpdatedByUserID`),
    CONSTRAINT `FK_Task_CreatedBy` FOREIGN KEY (`CreatedByUserID`) REFERENCES `UserAccount` (`UserID`),
    CONSTRAINT `FK_Task_Issue` FOREIGN KEY (`IssueID`) REFERENCES `IssueReport` (`IssueID`),
    CONSTRAINT `FK_Task_LastUpdatedBy` FOREIGN KEY (`LastUpdatedByUserID`) REFERENCES `UserAccount` (`UserID`),
    CONSTRAINT `FK_Task_Machine` FOREIGN KEY (`MachineID`) REFERENCES `Machine` (`MachineID`),
    CONSTRAINT `FK_Task_Technician` FOREIGN KEY (`AssignedTechnicianID`) REFERENCES `UserAccount` (`UserID`),
    CONSTRAINT `CHK_Task_CompletedAt` CHECK (((`CompletedAt` is null) or (`CompletedAt` >= `CreatedAt`)))
)

CREATE TABLE `Part`(
    `PartID` int NOT NULL AUTO_INCREMENT,
    `PartNumber` varchar(100) NOT NULL,
    `PartName` varchar(100) NOT NULL,
    `Description` text NOT NULL,
    PRIMARY KEY (`PartID`),
    UNIQUE KEY `PartNumber` (`PartNumber`)
)

CREATE TABLE `MaintenanceTaskPart` (
    `TaskID` int NOT NULL,
    `PartID` int NOT NULL,
    `QuantityUsed` int NOT NULL,
    PRIMARY KEY (`TaskID`,`PartID`),
    KEY `FK_TaskPart_Part` (`PartID`),
    CONSTRAINT `FK_TaskPart_Part` FOREIGN KEY (`PartID`) REFERENCES `Part` (`PartID`),
    CONSTRAINT `FK_TaskPart_Task` FOREIGN KEY (`TaskID`) REFERENCES `MaintenanceTask` (`TaskID`),
    CONSTRAINT `CHK_QuantityUsed` CHECK ((`QuantityUsed` > 0))
) 