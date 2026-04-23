using System.Security.Claims;
using AppointmentScheduler.Application.DTOs;
using AppointmentScheduler.Application.Interfaces;
using AppointmentScheduler.Application.Services;
using AppointmentScheduler.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace AppointmentScheduler.API.Controllers;

[ApiController]
[Route("api/whatsapp-session")]
[Authorize]
public class WhatsAppSessionController : ControllerBase
{
    private readonly IWhatsAppClient _whatsapp;
    private readonly IWhatsAppSessionRepository _sessions;
    private readonly IUserBusinessRepository _userBusinesses;
    private readonly FeatureFlags _features;

    public WhatsAppSessionController(
        IWhatsAppClient whatsapp,
        IWhatsAppSessionRepository sessions,
        IUserBusinessRepository userBusinesses,
        IOptions<FeatureFlags> features)
    {
        _whatsapp = whatsapp;
        _sessions = sessions;
        _userBusinesses = userBusinesses;
        _features = features.Value;
    }

    [HttpGet("ping")]
    public async Task<IActionResult> Ping(CancellationToken ct)
    {
        if (!_features.WhatsAppAutomation) return NotFound();
        var ok = await _whatsapp.PingAsync(ct);
        return Ok(new { serviceReachable = ok });
    }

    [HttpGet]
    public async Task<IActionResult> GetStatus(CancellationToken ct)
    {
        if (!_features.WhatsAppAutomation) return NotFound();
        var ctx = await AuthorizeAsync();
        if (ctx is null) return Forbid();

        var session = await _sessions.GetByBusinessIdAsync(ctx.BusinessId, ct);
        if (session is null)
        {
            return Ok(new WhatsAppSessionStatusDto(
                WhatsAppSessionStatus.Disconnected, null, null, null, null, AutoRemindersEnabled: false));
        }
        return Ok(ToDto(session));
    }

    [HttpPost("start")]
    public async Task<IActionResult> Start(CancellationToken ct)
    {
        if (!_features.WhatsAppAutomation) return NotFound();
        var ctx = await AuthorizeAsync();
        if (ctx is null) return Forbid();

        var session = await _sessions.GetByBusinessIdAsync(ctx.BusinessId, ct);
        var now = DateTime.UtcNow;
        if (session is null)
        {
            session = new WhatsAppSession
            {
                Id = Guid.NewGuid(),
                BusinessId = ctx.BusinessId,
                Status = WhatsAppSessionStatus.Starting,
                AutoRemindersEnabled = false,
                CreatedAt = now,
                UpdatedAt = now
            };
            await _sessions.AddAsync(session, ct);
        }
        else
        {
            session.Status = WhatsAppSessionStatus.Starting;
            session.LastError = null;
            session.UpdatedAt = now;
        }
        await _sessions.SaveChangesAsync(ct);

        var result = await _whatsapp.StartSessionAsync(ctx.BusinessId, ct);
        if (result is null)
        {
            session.Status = WhatsAppSessionStatus.Failed;
            session.LastError = "whatsapp-service unreachable";
            session.UpdatedAt = DateTime.UtcNow;
            await _sessions.SaveChangesAsync(ct);
            return StatusCode(502, new { error = "whatsapp-service unreachable" });
        }

        session.Status = result.Status;
        session.LastError = result.LastError;
        session.UpdatedAt = DateTime.UtcNow;
        if (result.Status == WhatsAppSessionStatus.WaitingQr)
            session.LastQrGeneratedAt = session.UpdatedAt;
        await _sessions.SaveChangesAsync(ct);

        return Ok(ToDto(session));
    }

    [HttpGet("qr")]
    public async Task<IActionResult> GetQr(CancellationToken ct)
    {
        if (!_features.WhatsAppAutomation) return NotFound();
        var ctx = await AuthorizeAsync();
        if (ctx is null) return Forbid();

        var png = await _whatsapp.GetQrAsync(ctx.BusinessId, ct);
        if (png is null || png.Length == 0) return NotFound();
        return File(png, "image/png");
    }

    [HttpDelete]
    public async Task<IActionResult> Disconnect(CancellationToken ct)
    {
        if (!_features.WhatsAppAutomation) return NotFound();
        var ctx = await AuthorizeAsync();
        if (ctx is null) return Forbid();

        await _whatsapp.DisconnectAsync(ctx.BusinessId, ct);

        var session = await _sessions.GetByBusinessIdAsync(ctx.BusinessId, ct);
        if (session is not null)
        {
            await _sessions.DeleteAsync(session, ct);
            await _sessions.SaveChangesAsync(ct);
        }
        return NoContent();
    }

    [HttpPatch]
    public async Task<IActionResult> UpdateSettings([FromBody] UpdateSessionSettingsRequest request, CancellationToken ct)
    {
        if (!_features.WhatsAppAutomation) return NotFound();
        var ctx = await AuthorizeAsync();
        if (ctx is null) return Forbid();

        var session = await _sessions.GetByBusinessIdAsync(ctx.BusinessId, ct);
        if (session is null) return NotFound();

        session.AutoRemindersEnabled = request.AutoRemindersEnabled;
        session.UpdatedAt = DateTime.UtcNow;
        await _sessions.SaveChangesAsync(ct);
        return Ok(ToDto(session));
    }

    private static WhatsAppSessionStatusDto ToDto(WhatsAppSession s) => new(
        s.Status, s.PhoneNumber, s.LastConnectedAt, s.LastQrGeneratedAt, s.LastError, s.AutoRemindersEnabled);

    private async Task<AuthContext?> AuthorizeAsync()
    {
        var userClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var businessClaim = User.FindFirstValue("businessId");
        if (!Guid.TryParse(userClaim, out var userId)) return null;
        if (!Guid.TryParse(businessClaim, out var businessId)) return null;
        if (!await _userBusinesses.HasAccessAsync(userId, businessId)) return null;
        return new AuthContext(userId, businessId);
    }

    private record AuthContext(Guid UserId, Guid BusinessId);
}
