using AppointmentScheduler.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AppointmentScheduler.API.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Policy = "SuperAdmin")]
public class AdminController : ControllerBase
{
    private readonly AdminService _service;

    public AdminController(AdminService service) => _service = service;

    [HttpGet("overview")]
    public async Task<IActionResult> GetOverview() =>
        Ok(await _service.GetOverviewAsync());

    [HttpGet("businesses")]
    public async Task<IActionResult> GetBusinesses() =>
        Ok(await _service.GetBusinessesAsync());

    [HttpGet("businesses/{id:guid}")]
    public async Task<IActionResult> GetBusinessDetail(Guid id)
    {
        var detail = await _service.GetBusinessDetailAsync(id);
        return detail == null ? NotFound() : Ok(detail);
    }

    [HttpGet("activity")]
    public async Task<IActionResult> GetActivity([FromQuery] int limit = 50) =>
        Ok(await _service.GetRecentActivityAsync(limit));
}
