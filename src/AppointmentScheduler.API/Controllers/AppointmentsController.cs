using AppointmentScheduler.API.Extensions;
using AppointmentScheduler.Application.DTOs;
using AppointmentScheduler.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AppointmentScheduler.API.Controllers;

[ApiController]
[Route("api/appointments")]
public class AppointmentsController : ControllerBase
{
    private readonly AppointmentService _appointmentService;
    private readonly BusinessService _businessService;

    public AppointmentsController(AppointmentService appointmentService, BusinessService businessService)
    {
        _appointmentService = appointmentService;
        _businessService = businessService;
    }

    // Public: called from public booking page (no auth required)
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateAppointmentRequest request)
    {
        var result = await _appointmentService.CreateAsync(request);
        return Created($"/api/appointments/{result.Id}", result);
    }

    [Authorize]
    [HttpGet]
    public async Task<IActionResult> GetByBusiness(
        [FromQuery] Guid businessId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var userId = User.GetUserId();
        await _businessService.ValidateOwnershipAsync(userId, businessId);
        var results = await _appointmentService.GetByBusinessIdAsync(businessId, page, pageSize);
        return Ok(results);
    }

    [Authorize]
    [HttpPatch("{id:guid}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromQuery] Guid businessId, [FromBody] UpdateAppointmentStatusRequest request)
    {
        var userId = User.GetUserId();
        await _businessService.ValidateOwnershipAsync(userId, businessId);
        var result = await _appointmentService.UpdateStatusAsync(id, businessId, request.Status);
        return Ok(result);
    }

    [Authorize]
    [HttpPatch("{id:guid}/notes")]
    public async Task<IActionResult> UpdateNotes(Guid id, [FromQuery] Guid businessId, [FromBody] UpdateAppointmentNotesRequest request)
    {
        var userId = User.GetUserId();
        await _businessService.ValidateOwnershipAsync(userId, businessId);
        var result = await _appointmentService.UpdateNotesAsync(id, businessId, request.Notes);
        return Ok(result);
    }

    [Authorize]
    [HttpGet("reminders/pending")]
    public async Task<IActionResult> GetPendingWhatsAppReminders([FromQuery] Guid businessId)
    {
        var userId = User.GetUserId();
        await _businessService.ValidateOwnershipAsync(userId, businessId);
        var results = await _appointmentService.GetPendingWhatsAppRemindersAsync(businessId);
        return Ok(results);
    }

    [Authorize]
    [HttpPost("{id:guid}/reminders/whatsapp")]
    public async Task<IActionResult> MarkWhatsAppReminderSent(Guid id, [FromQuery] Guid businessId)
    {
        var userId = User.GetUserId();
        await _businessService.ValidateOwnershipAsync(userId, businessId);
        await _appointmentService.MarkWhatsAppReminderSentAsync(id, businessId);
        return NoContent();
    }
}
