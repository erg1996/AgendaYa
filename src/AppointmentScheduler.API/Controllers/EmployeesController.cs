using AppointmentScheduler.API.Extensions;
using AppointmentScheduler.Application.DTOs;
using AppointmentScheduler.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AppointmentScheduler.API.Controllers;

[ApiController]
[Route("api/employees")]
[Authorize]
public class EmployeesController : ControllerBase
{
    private readonly EmployeeManagementService _service;
    private readonly BusinessService _businessService;

    public EmployeesController(EmployeeManagementService service, BusinessService businessService)
    {
        _service = service;
        _businessService = businessService;
    }

    [HttpGet]
    public async Task<IActionResult> GetByBusiness([FromQuery] Guid businessId, [FromQuery] bool includeInactive = false)
    {
        var userId = User.GetUserId();
        await _businessService.ValidateOwnershipAsync(userId, businessId);
        var results = await _service.GetByBusinessAsync(businessId, includeInactive);
        return Ok(results);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var userId = User.GetUserId();
        var result = await _service.GetByIdAsync(id);
        await _businessService.ValidateOwnershipAsync(userId, result.BusinessId);
        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateEmployeeRequest request)
    {
        var userId = User.GetUserId();
        await _businessService.ValidateOwnershipAsync(userId, request.BusinessId);
        var result = await _service.CreateAsync(request);
        return Created($"/api/employees/{result.Id}", result);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromQuery] Guid businessId, [FromBody] UpdateEmployeeRequest request)
    {
        var userId = User.GetUserId();
        await _businessService.ValidateOwnershipAsync(userId, businessId);
        var result = await _service.UpdateAsync(id, businessId, request);
        return Ok(result);
    }

    // Working hours sub-resource

    [HttpGet("{employeeId:guid}/working-hours")]
    public async Task<IActionResult> GetWorkingHours(Guid employeeId, [FromQuery] Guid businessId)
    {
        var userId = User.GetUserId();
        await _businessService.ValidateOwnershipAsync(userId, businessId);
        var results = await _service.GetWorkingHoursAsync(employeeId, businessId);
        return Ok(results);
    }

    [HttpPost("{employeeId:guid}/working-hours")]
    public async Task<IActionResult> AddWorkingHours(Guid employeeId, [FromQuery] Guid businessId, [FromBody] CreateWorkingHoursRequest request)
    {
        var userId = User.GetUserId();
        await _businessService.ValidateOwnershipAsync(userId, businessId);
        var result = await _service.AddWorkingHoursAsync(employeeId, businessId, request);
        return Created($"/api/employees/{employeeId}/working-hours/{result.Id}", result);
    }

    [HttpPut("{employeeId:guid}/working-hours/{whId:guid}")]
    public async Task<IActionResult> UpdateWorkingHours(Guid employeeId, Guid whId, [FromQuery] Guid businessId, [FromBody] CreateWorkingHoursRequest request)
    {
        var userId = User.GetUserId();
        await _businessService.ValidateOwnershipAsync(userId, businessId);
        var result = await _service.UpdateWorkingHoursAsync(whId, businessId, request);
        return Ok(result);
    }

    [HttpDelete("{employeeId:guid}/working-hours/{whId:guid}")]
    public async Task<IActionResult> DeleteWorkingHours(Guid employeeId, Guid whId, [FromQuery] Guid businessId)
    {
        var userId = User.GetUserId();
        await _businessService.ValidateOwnershipAsync(userId, businessId);
        await _service.DeleteWorkingHoursAsync(whId, businessId);
        return NoContent();
    }
}
