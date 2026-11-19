using System;

namespace AutoTrack.Models;

public class IssueReportDto
{
    public int IssueID { get; set; }
    public int MachineID { get; set; }
    public string MachineName { get; set; } = string.Empty;
    public int ReportedByUserID { get; set; }
    public string Description { get; set; } = string.Empty;
    public string Priority { get; set; } = string.Empty;
    public string IssueStatus { get; set; } = string.Empty;
    public DateTime ReportedAt { get; set; }
    public DateTime? ResolvedAt { get; set; }
}
