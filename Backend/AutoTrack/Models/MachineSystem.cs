using System;

namespace AutoTrack.Models;

public class MachineSystem
{
    public int SystemId { get; set; }
    public int AreaId { get; set; }
    public required string SystemName { get; set; }
    public required string Description { get; set; }
}
