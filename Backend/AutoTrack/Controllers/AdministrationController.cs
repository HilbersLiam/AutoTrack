using AutoTrack.Models;
using AutoTrack.Repositories.Interfaces;
using Microsoft.AspNetCore.Mvc;
using MySqlConnector;

namespace AutoTrack.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AdministrationController : ControllerBase
{
    private readonly IAdministration _repo;

    private static readonly HashSet<string> ValidStatuses = new(StringComparer.OrdinalIgnoreCase)
    {
        "Operational",
        "Down",
        "Under Maintenance"
    };

    public AdministrationController(IAdministration repo)
    {
        _repo = repo;
    }

    // --- Production Areas ---

    [HttpGet("areas")]
    public async Task<ActionResult<List<ProductionAreaDto>>> GetAreas()
    {
        return Ok(await _repo.GetAreasAsync());
    }

    [HttpPost("areas")]
    public async Task<ActionResult<object>> CreateArea([FromBody] UpsertProductionAreaDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.AreaName))
            return BadRequest("Area name is required.");

        dto.AreaName = dto.AreaName.Trim();

        try
        {
            var areaId = await _repo.CreateAreaAsync(dto);
            return Ok(new { areaId });
        }
        catch (MySqlException ex) when (ex.Number == 1062)
        {
            return Conflict("A production area with this name already exists.");
        }
    }

    [HttpPut("areas/{id:int}")]
    public async Task<IActionResult> UpdateArea(int id, [FromBody] UpsertProductionAreaDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.AreaName))
            return BadRequest("Area name is required.");

        dto.AreaName = dto.AreaName.Trim();

        try
        {
            var updated = await _repo.UpdateAreaAsync(id, dto);
            return updated ? NoContent() : NotFound();
        }
        catch (MySqlException ex) when (ex.Number == 1062)
        {
            return Conflict("A production area with this name already exists.");
        }
    }

    // --- Machine Systems ---

    [HttpGet("systems")]
    public async Task<ActionResult<List<MachineSystemDto>>> GetSystems()
    {
        return Ok(await _repo.GetSystemsAsync());
    }

    [HttpPost("systems")]
    public async Task<ActionResult<object>> CreateSystem([FromBody] UpsertMachineSystemDto dto)
    {
        if (dto.AreaId <= 0)
            return BadRequest("Valid AreaId is required.");
        if (string.IsNullOrWhiteSpace(dto.SystemName))
            return BadRequest("System name is required.");

        dto.SystemName = dto.SystemName.Trim();

        try
        {
            var systemId = await _repo.CreateSystemAsync(dto);
            return Ok(new { systemId });
        }
        catch (MySqlException ex) when (ex.Number == 1062)
        {
            return Conflict("A system with this name already exists in that area.");
        }
    }

    [HttpPut("systems/{id:int}")]
    public async Task<IActionResult> UpdateSystem(int id, [FromBody] UpsertMachineSystemDto dto)
    {
        if (dto.AreaId <= 0)
            return BadRequest("Valid AreaId is required.");
        if (string.IsNullOrWhiteSpace(dto.SystemName))
            return BadRequest("System name is required.");

        dto.SystemName = dto.SystemName.Trim();

        try
        {
            var updated = await _repo.UpdateSystemAsync(id, dto);
            return updated ? NoContent() : NotFound();
        }
        catch (MySqlException ex) when (ex.Number == 1062)
        {
            return Conflict("A system with this name already exists in that area.");
        }
    }

    // --- Machines ---

    [HttpGet("machines")]
    public async Task<ActionResult<List<AdminMachineDto>>> GetMachines()
    {
        return Ok(await _repo.GetMachinesAsync());
    }

    [HttpPost("machines")]
    public async Task<ActionResult<object>> CreateMachine([FromBody] CreateAdminMachineDto dto)
    {
        if (dto.SystemId <= 0)
            return BadRequest("Valid SystemId is required.");
        if (string.IsNullOrWhiteSpace(dto.MachineName))
            return BadRequest("Machine name is required.");
        if (!ValidStatuses.Contains(dto.Status))
            return BadRequest("Invalid machine status.");
        if (dto.ChangedByUserId <= 0)
            return BadRequest("Valid ChangedByUserId is required.");

        dto.MachineName = dto.MachineName.Trim();
        var machineId = await _repo.CreateMachineAsync(dto);
        return Ok(new { machineId });
    }

    [HttpPut("machines/{id:int}")]
    public async Task<IActionResult> UpdateMachine(int id, [FromBody] UpdateAdminMachineDto dto)
    {
        if (dto.SystemId <= 0)
            return BadRequest("Valid SystemId is required.");
        if (string.IsNullOrWhiteSpace(dto.MachineName))
            return BadRequest("Machine name is required.");
        if (!ValidStatuses.Contains(dto.Status))
            return BadRequest("Invalid machine status.");
        if (dto.ChangedByUserId <= 0)
            return BadRequest("Valid ChangedByUserId is required.");

        dto.MachineName = dto.MachineName.Trim();
        var updated = await _repo.UpdateMachineAsync(id, dto);
        return updated ? NoContent() : NotFound();
    }

    [HttpPatch("machines/{id:int}/archive")]
    public async Task<IActionResult> SetArchived(int id, [FromBody] ArchiveMachineDto dto)
    {
        var updated = await _repo.SetMachineArchivedAsync(id, dto.IsArchived);
        return updated ? NoContent() : NotFound();
    }
}

public class ArchiveMachineDto
{
    public bool IsArchived { get; set; }
}