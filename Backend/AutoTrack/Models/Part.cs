using System;

namespace AutoTrack.Models;

public class Part
{
    public int PartId { get; set; }
    public required string PartNumber { get; set; }
    public required string PartName { get; set; }
    public required string Description { get; set; }

}
