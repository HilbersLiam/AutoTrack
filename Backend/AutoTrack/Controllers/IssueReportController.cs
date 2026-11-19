using AutoTrack.Models;
using AutoTrack.Repositories.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace AutoTrack.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class IssueReportController : ControllerBase
    {
        private readonly IIssueReport _issueReportRepository;
        public IssueReportController(IIssueReport issueReportRepository)
        {
            _issueReportRepository = issueReportRepository;
        }

        [HttpGet]
        public async Task<ActionResult<List<IssueReportDto>>> GetAllAsync()
        {
            var productionAreas = await _issueReportRepository.GetAllAsync();

            return Ok(productionAreas);
        }
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateIssueReportDto dto)
        {
            await _issueReportRepository.CreateIssueAsync(dto);
            return StatusCode(StatusCodes.Status201Created);
        }

        [HttpPatch("{id:int}/status")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateIssueStatusDto dto)
        {
            await _issueReportRepository.UpdateIssueAsync(id, dto);
            return NoContent();
        }
    }
}
