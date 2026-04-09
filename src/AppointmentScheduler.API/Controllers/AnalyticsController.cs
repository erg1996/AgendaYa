using AppointmentScheduler.API.Extensions;
using AppointmentScheduler.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AppointmentScheduler.API.Controllers;

[ApiController]
[Route("api/analytics")]
[Authorize]
public class AnalyticsController : ControllerBase
{
    private readonly AnalyticsService _service;
    private readonly BusinessService _businessService;

    public AnalyticsController(AnalyticsService service, BusinessService businessService)
    {
        _service = service;
        _businessService = businessService;
    }

    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard([FromQuery] Guid businessId)
    {
        var userId = User.GetUserId();
        await _businessService.ValidateOwnershipAsync(userId, businessId);
        var result = await _service.GetDashboardAsync(businessId);
        return Ok(result);
    }
}
