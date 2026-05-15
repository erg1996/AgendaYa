using AppointmentScheduler.API.Extensions;
using AppointmentScheduler.Application.DTOs;
using AppointmentScheduler.Application.Interfaces;
using AppointmentScheduler.Application.Services;
using AppointmentScheduler.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AppointmentScheduler.API.Controllers;

[ApiController]
[Route("api/whatsapp-log")]
[Authorize]
public class WhatsAppLogController : ControllerBase
{
    private readonly IWhatsAppLogRepository _logRepo;
    private readonly BusinessService _businessService;

    public WhatsAppLogController(IWhatsAppLogRepository logRepo, BusinessService businessService)
    {
        _logRepo = logRepo;
        _businessService = businessService;
    }

    [HttpGet]
    public async Task<IActionResult> GetLog(
        [FromQuery] Guid businessId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] string? type = null)
    {
        var userId = User.GetUserId();
        await _businessService.ValidateOwnershipAsync(userId, businessId);

        WhatsAppMessageType? typeFilter = type?.ToLowerInvariant() switch
        {
            "confirmation"   => WhatsAppMessageType.Confirmation,
            "autoreminder"   => WhatsAppMessageType.AutoReminder,
            "manualreminder" => WhatsAppMessageType.ManualReminder,
            "campaign"       => WhatsAppMessageType.Campaign,
            _ => null
        };

        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var (items, total) = await _logRepo.GetByBusinessIdAsync(businessId, page, pageSize, typeFilter);

        var response = items.Select(l => new WhatsAppLogResponse(
            l.Id, l.AppointmentId, l.SenderPhone, l.RecipientPhone, l.RecipientName,
            l.MessageType.ToString(), l.Success, l.ErrorReason, l.SentAt)).ToList();

        return Ok(new PaginatedResponse<WhatsAppLogResponse>(response, total, page, pageSize));
    }
}
