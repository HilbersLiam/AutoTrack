using System;

namespace AutoTrack.Models;

public class ProductionAreaMachineDto
{
    public int AreaID { get; set; }
    public required string AreaName { get; set; }
    public int? MachineID { get; set; }
    public string? MachineName { get; set; }
    public string? CurrentStatus { get; set; }
}
