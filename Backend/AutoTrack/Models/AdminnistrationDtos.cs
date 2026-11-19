namespace AutoTrack.Models;

public class ProductionAreaDto
{
    public int AreaId { get; set; }
    public string AreaName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
}

public class UpsertProductionAreaDto
{
    public string AreaName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
}

public class MachineSystemDto
{
    public int SystemId { get; set; }
    public int AreaId { get; set; }
    public string AreaName { get; set; } = string.Empty;
    public string SystemName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
}

public class UpsertMachineSystemDto
{
    public int AreaId { get; set; }
    public string SystemName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
}

public class AdminMachineDto
{
    public int MachineId { get; set; }
    public int SystemId { get; set; }
    public string SystemName { get; set; } = string.Empty;
    public int AreaId { get; set; }
    public string AreaName { get; set; } = string.Empty;
    public string MachineName { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool IsArchived { get; set; }
    public string Status { get; set; } = "Operational";
}

public class CreateAdminMachineDto
{
    public int SystemId { get; set; }
    public string MachineName { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Status { get; set; } = "Operational";
    public int ChangedByUserId { get; set; }
}

public class UpdateAdminMachineDto
{
    public int SystemId { get; set; }
    public string MachineName { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool IsArchived { get; set; }
    public string Status { get; set; } = "Operational";
    public int ChangedByUserId { get; set; }
}