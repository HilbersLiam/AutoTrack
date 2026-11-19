namespace AutoTrack.Models;

public class MaintenanceTaskPartDto
{
    public int PartId { get; set; }
    public string PartNumber { get; set; } = string.Empty;
    public string PartName { get; set; } = string.Empty;
    public int QuantityUsed { get; set; }
}

public class MaintenanceTaskDto
{
    public int TaskId { get; set; }
    public int MachineId { get; set; }
    public string MachineName { get; set; } = string.Empty;
    public int? IssueId { get; set; }
    public int? AssignedTechnicianId { get; set; }
    public string? AssignedTechnicianName { get; set; }
    public int CreatedByUserId { get; set; }
    public int LastUpdatedByUserId { get; set; }
    public string TaskDescription { get; set; } = string.Empty;
    public string TaskStatus { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime DueAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string? WorkPerformed { get; set; }
    public DateTime LastUpdatedAt { get; set; }
    public List<MaintenanceTaskPartDto> PartsUsed { get; set; } = new();
}

public class CreateMaintenanceTaskDto
{
    public int MachineId { get; set; }
    public int? IssueId { get; set; }
    public int? AssignedTechnicianId { get; set; }
    public int CreatedByUserId { get; set; }
    public string TaskDescription { get; set; } = string.Empty;
    public DateTime DueAt { get; set; }
}

public class TaskPartInputDto
{
    public int PartId { get; set; }
    public int QuantityUsed { get; set; }
}

public class UpdateMaintenanceTaskDto
{
    public int MachineId { get; set; }
    public int? IssueId { get; set; }
    public int? AssignedTechnicianId { get; set; }
    public int LastUpdatedByUserId { get; set; }
    public string TaskDescription { get; set; } = string.Empty;
    public DateTime DueAt { get; set; }
    public string? WorkPerformed { get; set; }
    public List<TaskPartInputDto> PartsUsed { get; set; } = new();
}

public class UpdateMaintenanceTaskStatusDto
{
    public string TaskStatus { get; set; } = string.Empty;
    public int LastUpdatedByUserId { get; set; }
}

public class PartDto
{
    public int PartId { get; set; }
    public string PartNumber { get; set; } = string.Empty;
    public string PartName { get; set; } = string.Empty;
    public string? Description { get; set; }
}