using AutoTrack.Models;
using AutoTrack.Repositories.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace AutoTrack.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ProductionAreaController : ControllerBase
    {
        private readonly IProductionArea _productionAreaRepository;
        public ProductionAreaController(IProductionArea productionAreaRepository)
        {
            _productionAreaRepository = productionAreaRepository;
        }

    [HttpGet]
        public async Task<ActionResult<List<ProductionAreaMachineDto>>> GetAllAsync()
        {
            var productionAreas = await _productionAreaRepository.GetAllAsync();

            return Ok(productionAreas);
        }
    }

}
