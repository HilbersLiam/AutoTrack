using System;

namespace AutoTrack.Models;

public class ProductionArea
{
    public int AreaId { get; set; }
    public required string AreaName { get; set; }
    public required string Description { get; set; }
}
