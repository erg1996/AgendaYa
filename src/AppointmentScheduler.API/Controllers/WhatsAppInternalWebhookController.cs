using System.Security.Cryptography;
using System.Text;
using AppointmentScheduler.Application.Interfaces;
using AppointmentScheduler.Application.Services;
using AppointmentScheduler.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace AppointmentScheduler.API.Controllers;

[ApiController]
[Route("api/internal/whatsapp")]
[AllowAnonymous]
public class WhatsAppInternalWebhookController : ControllerBase
{
    private readonly IWhatsAppSessionRepository _sessions;
    private readonly WhatsAppOptions _options;
    private readonly FeatureFlags _features;
    private readonly ILogger<WhatsAppInternalWebhookController> _logger;

    public WhatsAppInternalWebhookController(
        IWhatsAppSessionRepository sessions,
        IOptions<WhatsAppOptions> options,
        IOptions<FeatureFlags> features,
        ILogger<WhatsAppInternalWebhookController> logger)
    {
        _sessions = sessions;
        _options = options.Value;
        _features = features.Value;
        _logger = logger;
    }

    [HttpPost("webhook")]
    public async Task<IActionResult> Webhook([FromBody] WebhookPayload payload, CancellationToken ct)
    {
        if (!_features.WhatsAppAutomation) return NotFound();
        if (!ValidateSecret()) return Unauthorized();
        if (payload is null || payload.businessId == Guid.Empty || string.IsNullOrWhiteSpace(payload.@event))
            return BadRequest();

        var session = await _sessions.GetByBusinessIdAsync(payload.businessId, ct);
        if (session is null)
        {
            _logger.LogWarning("Webhook {Event} for unknown session {BusinessId}", payload.@event, payload.businessId);
            return NotFound();
        }

        var now = DateTime.UtcNow;
        switch (payload.@event.ToLowerInvariant())
        {
            case "session.connected":
                session.Status = WhatsAppSessionStatus.Connected;
                session.PhoneNumber = payload.phoneNumber;
                session.LastConnectedAt = now;
                session.LastError = null;
                break;
            case "session.disconnected":
                session.Status = WhatsAppSessionStatus.Disconnected;
                session.LastError = payload.reason;
                break;
            case "session.qr_refreshed":
                session.Status = WhatsAppSessionStatus.WaitingQr;
                session.LastQrGeneratedAt = now;
                break;
            case "session.failed":
                session.Status = WhatsAppSessionStatus.Failed;
                session.LastError = payload.reason ?? "unknown";
                break;
            default:
                _logger.LogInformation("Ignored webhook event {Event}", payload.@event);
                return Ok();
        }

        session.UpdatedAt = now;
        await _sessions.SaveChangesAsync(ct);
        return Ok();
    }

    private bool ValidateSecret()
    {
        var presented = Request.Headers["X-Internal-Secret"].ToString();
        if (string.IsNullOrEmpty(presented) || string.IsNullOrEmpty(_options.InternalSecret))
            return false;
        var a = Encoding.UTF8.GetBytes(presented);
        var b = Encoding.UTF8.GetBytes(_options.InternalSecret);
        if (a.Length != b.Length) return false;
        return CryptographicOperations.FixedTimeEquals(a, b);
    }

    public record WebhookPayload(Guid businessId, string @event, string? phoneNumber, string? reason);
}
