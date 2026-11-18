using System;

namespace AutoTrack.Models;

public class IssueReport
{
    public int IssueId { get; set; }
    public int MachineId { get; set; }
    public int ReportedByUserId { get; set; }
    public required string Description { get; set; }
    public required string Priority { get; set; }
    public required string IssueStatus { get; set; }
    public required DateTime ReportedAt { get; set; }
    public required DateTime ResolvedAt { get; set; }
}
