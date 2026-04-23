using AppointmentScheduler.Application.Interfaces;
using AppointmentScheduler.Application.Services;
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
    private readonly FeatureFlags _features;

    public WhatsAppSessionController(IWhatsAppClient whatsapp, IOptions<FeatureFlags> features)
    {
        _whatsapp = whatsapp;
        _features = features.Value;
    }

    [HttpGet("ping")]
    public async Task<IActionResult> Ping(CancellationToken ct)
    {
        if (!_features.WhatsAppAutomation)
            return NotFound();

        var ok = await _whatsapp.PingAsync(ct);
        return Ok(new { serviceReachable = ok });
    }
}
