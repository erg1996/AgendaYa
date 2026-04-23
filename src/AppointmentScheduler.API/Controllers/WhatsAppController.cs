using System.Security.Claims;
using AppointmentScheduler.Application.DTOs;
using AppointmentScheduler.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AppointmentScheduler.API.Controllers;

[ApiController]
[Route("api/whatsapp")]
[Authorize]
public class WhatsAppController : ControllerBase
{
    private readonly WhatsAppBroadcastService _service;

    public WhatsAppController(WhatsAppBroadcastService service) => _service = service;

    // ── Templates ────────────────────────────────────────────────────────────

    [HttpGet("templates")]
    public async Task<IActionResult> GetTemplates()
    {
        var businessId = GetBusinessId();
        return Ok(await _service.GetTemplatesAsync(businessId));
    }

    [HttpPost("templates")]
    public async Task<IActionResult> CreateTemplate([FromBody] CreateWhatsAppTemplateRequest request)
    {
        var businessId = GetBusinessId();
        var result = await _service.CreateTemplateAsync(businessId, request);
        return CreatedAtAction(nameof(GetTemplates), result);
    }

    [HttpPut("templates/{id:guid}")]
    public async Task<IActionResult> UpdateTemplate(Guid id, [FromBody] UpdateWhatsAppTemplateRequest request)
    {
        var businessId = GetBusinessId();
        return Ok(await _service.UpdateTemplateAsync(id, businessId, request));
    }

    [HttpDelete("templates/{id:guid}")]
    public async Task<IActionResult> DeleteTemplate(Guid id)
    {
        var businessId = GetBusinessId();
        await _service.DeleteTemplateAsync(id, businessId);
        return NoContent();
    }

    // ── Broadcast composer ───────────────────────────────────────────────────

    [HttpPost("broadcast/preview")]
    public async Task<IActionResult> PreviewBroadcast([FromBody] BroadcastPreviewRequest request)
    {
        var businessId = GetBusinessId();
        return Ok(await _service.PreviewBroadcastAsync(businessId, request));
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private Guid GetBusinessId()
    {
        var claim = User.FindFirstValue("businessId")
            ?? throw new UnauthorizedAccessException("businessId claim missing.");
        return Guid.Parse(claim);
    }
}
