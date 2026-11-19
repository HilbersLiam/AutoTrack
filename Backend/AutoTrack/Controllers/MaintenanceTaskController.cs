using AutoTrack.Models;
using AutoTrack.Repositories.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace AutoTrack.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MaintenanceTaskController : ControllerBase
{
    private readonly IMaintenanceTask _repo;

    private static readonly HashSet<string> ValidStatuses = new(StringComparer.OrdinalIgnoreCase)
    {
        "Scheduled",
        "In Progress",
        "Completed",
        "Cancelled"
    };

    public MaintenanceTaskController(IMaintenanceTask repo)
    {
        _repo = repo;
    }

    [HttpGet]
    public async Task<ActionResult<List<MaintenanceTaskDto>>> GetAll()
    {
        var tasks = await _repo.GetAllAsync();
        return Ok(tasks);
    }

    [HttpPost]
    public async Task<ActionResult<object>> Create([FromBody] CreateMaintenanceTaskDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.TaskDescription) || dto.TaskDescription.Trim().Length < 5)
            return BadRequest("TaskDescription must be at least 5 characters.");

        if (dto.CreatedByUserId <= 0)
            return BadRequest("Valid CreatedByUserId is required.");

        dto.TaskDescription = dto.TaskDescription.Trim();
        var newId = await _repo.CreateAsync(dto);
        return CreatedAtAction(nameof(GetAll), new { id = newId }, new { taskId = newId });
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateMaintenanceTaskDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.TaskDescription) || dto.TaskDescription.Trim().Length < 5)
            return BadRequest("TaskDescription must be at least 5 characters.");

        if (dto.LastUpdatedByUserId <= 0)
            return BadRequest("Valid LastUpdatedByUserId is required.");

        dto.TaskDescription = dto.TaskDescription.Trim();
        dto.WorkPerformed = string.IsNullOrWhiteSpace(dto.WorkPerformed) ? null : dto.WorkPerformed.Trim();

        var updated = await _repo.UpdateAsync(id, dto);
        if (!updated) return NotFound();

        return NoContent();
    }

    [HttpPatch("{id:int}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateMaintenanceTaskStatusDto dto)
    {
        if (!ValidStatuses.Contains(dto.TaskStatus))
            return BadRequest("Invalid TaskStatus.");

        if (dto.LastUpdatedByUserId <= 0)
            return BadRequest("Valid LastUpdatedByUserId is required.");

        var updated = await _repo.UpdateStatusAsync(id, dto);
        if (!updated) return NotFound();

        return NoContent();
    }
}