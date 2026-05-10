using AppointmentScheduler.Application.Services;
using Microsoft.AspNetCore.Mvc;

namespace AppointmentScheduler.API.Controllers;

[ApiController]
[Route("api/availability")]
public class AvailabilityController : ControllerBase
{
    private readonly AvailabilityService _service;

    public AvailabilityController(AvailabilityService service) => _service = service;

    [HttpGet]
    public async Task<IActionResult> GetAvailability(
        [FromQuery] Guid businessId,
        [FromQuery] DateTime date,
        [FromQuery] Guid serviceId,
        [FromQuery] Guid? employeeId = null)
    {
        var slots = await _service.GetAvailableSlotsAsync(businessId, date, serviceId, employeeId);
        return Ok(slots);
    }
}
