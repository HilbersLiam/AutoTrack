using AutoTrack.Models;
using AutoTrack.Repositories.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace AutoTrack.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PartController : ControllerBase
{
    private readonly IMaintenanceTask _repo;

    public PartController(IMaintenanceTask repo)
    {
        _repo = repo;
    }

    [HttpGet]
    public async Task<ActionResult<List<PartDto>>> GetAll()
    {
        var parts = await _repo.GetAllPartsAsync();
        return Ok(parts);
    }
}