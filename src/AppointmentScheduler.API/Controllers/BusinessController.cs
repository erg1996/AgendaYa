using AppointmentScheduler.API.Extensions;
using AppointmentScheduler.Application.DTOs;
using AppointmentScheduler.Application.Interfaces;
using AppointmentScheduler.Application.Services;
using AppointmentScheduler.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace AppointmentScheduler.API.Controllers;

[ApiController]
[Route("api/business")]
public class BusinessController : ControllerBase
{
    private readonly BusinessService _service;
    private readonly IWhatsAppSessionRepository _waSessions;
    private readonly FeatureFlags _features;
    private readonly ILogger<BusinessController> _logger;

    public BusinessController(
        BusinessService service,
        IWhatsAppSessionRepository waSessions,
        IOptions<FeatureFlags> features,
        ILogger<BusinessController> logger)
    {
        _service    = service;
        _waSessions = waSessions;
        _features   = features.Value;
        _logger     = logger;
    }

    // Public: used by public booking page
    [HttpGet("slug/{slug}")]
    public async Task<IActionResult> GetBySlug(string slug)
    {
        var result = await _service.GetBySlugAsync(slug);
        return Ok(result);
    }

    // Public: tells the booking page whether WhatsApp auto-reminders are available
    // so the consent checkbox can be pre-checked. Returns { active: false } gracefully
    // when the feature flag is off or the session isn't connected.
    [HttpGet("slug/{slug}/whatsapp-active")]
    public async Task<IActionResult> GetWhatsAppActive(string slug, CancellationToken ct)
    {
        if (!_features.WhatsAppAutomation) return Ok(new { active = false });
        BusinessResponse business;
        try { business = await _service.GetBySlugAsync(slug); }
        catch { return Ok(new { active = false }); }
        var session = await _waSessions.GetByBusinessIdAsync(business.Id, ct);
        var active = session?.Status == WhatsAppSessionStatus.Connected && session.AutoRemindersEnabled;
        return Ok(new { active });
    }

    // --- Authenticated endpoints below ---

    [Authorize]
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var userId = User.GetUserId();
        await _service.ValidateOwnershipAsync(userId, id);
        var result = await _service.GetByIdAsync(id);
        return Ok(result);
    }

    [Authorize]
    [HttpGet]
    public async Task<IActionResult> GetMyBusinesses()
    {
        var userId = User.GetUserId();
        _logger.LogWarning("[SECURITY] GetMyBusinesses called by userId={UserId}", userId);
        var results = await _service.GetAllByUserIdAsync(userId);
        _logger.LogWarning("[SECURITY] Returning {Count} businesses for userId={UserId}: {Names}",
            results.Count, userId, string.Join(", ", results.Select(r => r.Name)));
        return Ok(results);
    }

    [Authorize]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateBusinessRequest request)
    {
        var userId = User.GetUserId();
        var result = await _service.CreateForUserAsync(userId, request);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [Authorize]
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateBusinessRequest request)
    {
        var userId = User.GetUserId();
        var result = await _service.UpdateAsync(id, userId, request);
        return Ok(result);
    }
}
