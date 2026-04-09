using AppointmentScheduler.API.Extensions;
using AppointmentScheduler.Application.DTOs;
using AppointmentScheduler.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AppointmentScheduler.API.Controllers;

[ApiController]
[Route("api/working-hours")]
[Authorize]
public class WorkingHoursController : ControllerBase
{
    private readonly WorkingHoursService _service;
    private readonly BusinessService _businessService;

    public WorkingHoursController(WorkingHoursService service, BusinessService businessService)
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
    public async Task<IActionResult> Create([FromBody] CreateWorkingHoursRequest request)
    {
        var userId = User.GetUserId();
        await _businessService.ValidateOwnershipAsync(userId, request.BusinessId);
        var result = await _service.CreateAsync(request);
        return Created($"/api/working-hours/{result.Id}", result);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] CreateWorkingHoursRequest request)
    {
        var userId = User.GetUserId();
        await _businessService.ValidateOwnershipAsync(userId, request.BusinessId);
        var result = await _service.UpdateAsync(id, request);
        return Ok(result);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, [FromQuery] Guid businessId)
    {
        var userId = User.GetUserId();
        await _businessService.ValidateOwnershipAsync(userId, businessId);
        await _service.DeleteAsync(id);
        return NoContent();
    }
}
