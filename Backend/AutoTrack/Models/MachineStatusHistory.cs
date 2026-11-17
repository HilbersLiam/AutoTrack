using System;
using System.Net;

namespace AutoTrack.Models;

public class MachineStatusHistory
{
    public int StatusHistoryId { get; set; }
    public int MachineId { get; set; }
    public int ChangedByUserId { get; set; }
    public required string Status { get; set; }
    public required DateTime ChangedAt { get; set; }
}
