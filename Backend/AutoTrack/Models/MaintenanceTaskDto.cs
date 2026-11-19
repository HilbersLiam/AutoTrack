using System;

namespace AutoTrack.Models;

public class MaintenanceTaskDto
{
    public int TaskID { get; set; }
    public int MachineId { get; set; }
    public int IssueId { get; set; }
    public int AssignedTechnicianID { get; set; }
    public int CreatedByUserID { get; set; }
    public int LastUpdatedByUserID { get; set; }
    public required string TaskDescription { get; set; }
    public required string TaskStatus { get; set; }
    public required DateTime CreatedAt { get; set; }
    public required DateTime DueAt { get; set; }
    public required DateTime CompletedAt { get; set; }
    public required string WorkPerformed { get; set; }
    public required DateTime LastUpdatedAt { get; set; }

}
