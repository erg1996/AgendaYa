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
    private readonly EmployeeManagementService _service;
    private readonly BusinessService _businessService;

    public WorkingHoursController(EmployeeManagementService service, BusinessService businessService)
    {
        _service = service;
        _businessService = businessService;
    }

    [HttpGet]
    public async Task<IActionResult> GetByEmployeeId([FromQuery] Guid employeeId, [FromQuery] Guid businessId)
    {
        var userId = User.GetUserId();
        await _businessService.ValidateOwnershipAsync(userId, businessId);
        var results = await _service.GetWorkingHoursAsync(employeeId, businessId);
        return Ok(results);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateWorkingHoursRequest request, [FromQuery] Guid businessId)
    {
        var userId = User.GetUserId();
        await _businessService.ValidateOwnershipAsync(userId, businessId);
        var result = await _service.AddWorkingHoursAsync(request.EmployeeId, businessId, request);
        return Created($"/api/working-hours/{result.Id}", result);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] CreateWorkingHoursRequest request, [FromQuery] Guid businessId)
    {
        var userId = User.GetUserId();
        await _businessService.ValidateOwnershipAsync(userId, businessId);
        var result = await _service.UpdateWorkingHoursAsync(id, businessId, request);
        return Ok(result);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, [FromQuery] Guid businessId)
    {
        var userId = User.GetUserId();
        await _businessService.ValidateOwnershipAsync(userId, businessId);
        await _service.DeleteWorkingHoursAsync(id, businessId);
        return NoContent();
    }
}
