namespace AutoTrack.Models;

public class MachineStatusHistoryDto
{
    public int StatusHistoryId { get; set; }
    public int MachineId { get; set; }
    public string MachineName { get; set; } = string.Empty;
    public string AreaName { get; set; } = string.Empty;
    public string SystemName { get; set; } = string.Empty;
    public int ChangedByUserId { get; set; }
    public string ChangedByName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime ChangedAt { get; set; }
}