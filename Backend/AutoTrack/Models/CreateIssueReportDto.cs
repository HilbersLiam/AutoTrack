using System;

namespace AutoTrack.Models;

public class CreateIssueReportDto
{
    public int MachineID { get; set; }
    public int ReportedByUserID { get; set; }
    public string Description { get; set; } = string.Empty;
    public string Priority { get; set; } = "Medium";
    public string IssueStatus { get; set; } = "Open";
}
