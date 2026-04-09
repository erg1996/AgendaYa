using AppointmentScheduler.API.Extensions;
using AppointmentScheduler.Application.DTOs;
using AppointmentScheduler.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AppointmentScheduler.API.Controllers;

[ApiController]
[Route("api/services")]
public class ServicesController : ControllerBase
{
    private readonly ServiceService _service;
    private readonly BusinessService _businessService;

    public ServicesController(ServiceService service, BusinessService businessService)
    {
        _service = service;
        _businessService = businessService;
    }

    // Public: needed by public booking page to list services
    [HttpGet]
    public async Task<IActionResult> GetByBusiness([FromQuery] Guid businessId)
    {
        var results = await _service.GetByBusinessIdAsync(businessId);
        return Ok(results);
    }

    [Authorize]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateServiceRequest request)
    {
        var userId = User.GetUserId();
        await _businessService.ValidateOwnershipAsync(userId, request.BusinessId);
        var result = await _service.CreateAsync(request);
        return Created($"/api/services/{result.Id}", result);
    }

    [Authorize]
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, [FromQuery] Guid businessId)
    {
        var userId = User.GetUserId();
        await _businessService.ValidateOwnershipAsync(userId, businessId);
        await _service.DeleteAsync(id, businessId);
        return NoContent();
    }
}
