using AppointmentScheduler.API.Extensions;
using AppointmentScheduler.Application.DTOs;
using AppointmentScheduler.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AppointmentScheduler.API.Controllers;

[ApiController]
[Route("api/blocked-dates")]
[Authorize]
public class BlockedDatesController : ControllerBase
{
    private readonly BlockedDateService _service;
    private readonly BusinessService _businessService;

    public BlockedDatesController(BlockedDateService service, BusinessService businessService)
    {
        _service = service;
        _businessService = businessService;
    }

    [HttpGet]
    public async Task<IActionResult> GetByBusinessId([FromQuery] Guid businessId)
    {
        var userId = User.GetUserId();
        await _businessService.ValidateOwnershipAsync(userId, businessId);
        var results = await _service.GetByBusinessIdAsync(businessId);
        return Ok(results);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateBlockedDateRequest request)
    {
        var userId = User.GetUserId();
        await _businessService.ValidateOwnershipAsync(userId, request.BusinessId);
        var result = await _service.CreateAsync(request);
        return Created($"/api/blocked-dates/{result.Id}", result);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, [FromQuery] Guid businessId)
    {
        var userId = User.GetUserId();
        await _businessService.ValidateOwnershipAsync(userId, businessId);
        await _service.DeleteAsync(id, businessId);
        return NoContent();
    }
}
