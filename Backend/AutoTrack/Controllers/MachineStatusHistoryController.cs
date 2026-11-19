using AutoTrack.Models;
using AutoTrack.Repositories.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace AutoTrack.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MachineStatusHistoryController : ControllerBase
{
    private readonly IMachineStatusHistory _repo;

    public MachineStatusHistoryController(IMachineStatusHistory repo)
    {
        _repo = repo;
    }

    [HttpGet]
    public async Task<ActionResult<List<MachineStatusHistoryDto>>> GetAll()
    {
        var history = await _repo.GetAllAsync();
        return Ok(history);
    }
}