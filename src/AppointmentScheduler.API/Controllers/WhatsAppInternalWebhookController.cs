using System.Security.Cryptography;
using System.Text;
using AppointmentScheduler.Application.Interfaces;
using AppointmentScheduler.Application.Services;
using AppointmentScheduler.Domain.Entities;
using AppointmentScheduler.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace AppointmentScheduler.API.Controllers;

[ApiController]
[Route("api/internal/whatsapp")]
[AllowAnonymous]
public class WhatsAppInternalWebhookController : ControllerBase
{
    private readonly IWhatsAppSessionRepository _sessions;
    private readonly IAppointmentRepository _appointments;
    private readonly IWhatsAppBlacklistRepository _blacklist;
    private readonly IEmailService _email;
    private readonly AppDbContext _db;
    private readonly WhatsAppOptions _options;
    private readonly FeatureFlags _features;
    private readonly ILogger<WhatsAppInternalWebhookController> _logger;

    public WhatsAppInternalWebhookController(
        IWhatsAppSessionRepository sessions,
        IAppointmentRepository appointments,
        IWhatsAppBlacklistRepository blacklist,
        IEmailService email,
        AppDbContext db,
        IOptions<WhatsAppOptions> options,
        IOptions<FeatureFlags> features,
        ILogger<WhatsAppInternalWebhookController> logger)
    {
        _sessions     = sessions;
        _appointments = appointments;
        _blacklist    = blacklist;
        _email        = email;
        _db           = db;
        _options      = options.Value;
        _features     = features.Value;
        _logger       = logger;
    }

    [HttpPost("webhook")]
    public async Task<IActionResult> Webhook([FromBody] WebhookPayload payload, CancellationToken ct)
    {
        if (!_features.WhatsAppAutomation) return NotFound();
        if (!ValidateSecret()) return Unauthorized();
        if (payload is null || payload.businessId == Guid.Empty || string.IsNullOrWhiteSpace(payload.@event))
            return BadRequest();

        var now = DateTime.UtcNow;

        switch (payload.@event.ToLowerInvariant())
        {
            case "session.connected":
            case "session.disconnected":
            case "session.qr_refreshed":
            case "session.failed":
                return await HandleSessionEvent(payload, now, ct);

            case "message.delivered":
                if (payload.appointmentId.HasValue)
                    await _appointments.ClaimWhatsAppReminderAsync(payload.appointmentId.Value);
                return Ok();

            case "message.failed":
                if (payload.appointmentId.HasValue)
                    await _appointments.MarkWhatsAppReminderFailedAsync(payload.appointmentId.Value);
                return Ok();

            case "inbound.baja":
                return await HandleBaja(payload, now, ct);

            default:
                _logger.LogInformation("Ignored webhook event {Event}", payload.@event);
                return Ok();
        }
    }

    private async Task<IActionResult> HandleSessionEvent(WebhookPayload payload, DateTime now, CancellationToken ct)
    {
        var session = await _sessions.GetByBusinessIdAsync(payload.businessId, ct);
        if (session is null)
        {
            _logger.LogWarning("Webhook {Event} for unknown session {BusinessId}", payload.@event, payload.businessId);
            return NotFound();
        }

        var wasConnected = session.Status == WhatsAppSessionStatus.Connected;

        switch (payload.@event.ToLowerInvariant())
        {
            case "session.connected":
                // Reset warm-up clock when a DIFFERENT number connects so the new
                // number starts at tier-1 limits (10/day) instead of inheriting
                // the old number's established-sender rate.
                var isNewNumber = !string.IsNullOrEmpty(payload.phoneNumber)
                                  && payload.phoneNumber != session.PhoneNumber;
                if (session.FirstConnectedAt is null || isNewNumber)
                    session.FirstConnectedAt = now;
                session.Status = WhatsAppSessionStatus.Connected;
                session.PhoneNumber = payload.phoneNumber;
                session.LastConnectedAt = now;
                session.LastError = null;
                break;
            case "session.disconnected":
                session.Status = WhatsAppSessionStatus.Disconnected;
                session.LastError = payload.reason;
                if (wasConnected)
                    await TrySendSessionDownEmailAsync(session, "desconectada", ct);
                break;
            case "session.qr_refreshed":
                session.Status = WhatsAppSessionStatus.WaitingQr;
                session.LastQrGeneratedAt = now;
                break;
            case "session.failed":
                session.Status = WhatsAppSessionStatus.Failed;
                session.LastError = payload.reason ?? "unknown";
                if (wasConnected)
                    await TrySendSessionDownEmailAsync(session, "con error", ct);
                break;
        }

        session.UpdatedAt = now;
        await _sessions.SaveChangesAsync(ct);
        return Ok();
    }

    private async Task<IActionResult> HandleBaja(WebhookPayload payload, DateTime now, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(payload.phone)) return BadRequest("phone required");

        var normalized = new string(payload.phone.Where(char.IsDigit).ToArray());
        if (string.IsNullOrEmpty(normalized)) return BadRequest("invalid phone");

        var alreadyBlocked = await _blacklist.IsBlockedAsync(payload.businessId, normalized, ct);
        if (!alreadyBlocked)
        {
            await _blacklist.AddAsync(new WhatsAppBlacklist
            {
                Id = Guid.NewGuid(),
                BusinessId = payload.businessId,
                NormalizedPhone = normalized,
                CreatedAt = now,
            }, ct);
            await _blacklist.SaveChangesAsync(ct);
            _logger.LogInformation("Added {Phone} to WhatsApp blacklist for business {BusinessId}", normalized, payload.businessId);
        }
        return Ok();
    }

    private async Task TrySendSessionDownEmailAsync(WhatsAppSession session, string estado, CancellationToken ct)
    {
        try
        {
            // Find all users associated with this business to notify them
            var ownerEmails = await _db.UserBusinesses
                .Where(ub => ub.BusinessId == session.BusinessId)
                .Join(_db.Users, ub => ub.UserId, u => u.Id, (ub, u) => u.Email)
                .ToListAsync(ct);

            var business = await _db.Businesses.FindAsync([session.BusinessId], ct);
            var businessName = business?.Name ?? session.BusinessId.ToString();

            foreach (var email in ownerEmails)
                await _email.SendWhatsAppSessionDownAsync(email, businessName, session.PhoneNumber, estado, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send session-down email for business {BusinessId}", session.BusinessId);
        }
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

    public record WebhookPayload(
        Guid businessId,
        string @event,
        string? phoneNumber,
        string? reason,
        string? phone,
        Guid? appointmentId);
}
