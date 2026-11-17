using System;

namespace AutoTrack.Models;

public class MaintenanceTaskPart
{
    public int TaskId { get; set; }
    public int PartId { get; set; }
    public int QuantityUsed { get; set; }
}
