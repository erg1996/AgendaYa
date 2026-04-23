using AppointmentScheduler.API.Extensions;
using AppointmentScheduler.API.Services;
using AppointmentScheduler.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AppointmentScheduler.API.Controllers;

/// <summary>
/// Server-Sent Events endpoint. Browsers open a persistent GET connection here;
/// the server pushes a line whenever an appointment in that business changes.
/// Auth is done via a JWT passed as ?token= because EventSource cannot set headers.
/// </summary>
[ApiController]
[Route("api/events")]
[Authorize]
public class EventsController : ControllerBase
{
    private readonly AppointmentEventService _events;
    private readonly BusinessService _businessService;

    public EventsController(AppointmentEventService events, BusinessService businessService)
    {
        _events = events;
        _businessService = businessService;
    }

    [HttpGet("stream")]
    public async Task Stream([FromQuery] Guid businessId, CancellationToken ct)
    {
        var userId = User.GetUserId();
        await _businessService.ValidateOwnershipAsync(userId, businessId);

        var (subId, reader) = _events.Subscribe(businessId);

        Response.Headers["Content-Type"]      = "text/event-stream; charset=utf-8";
        Response.Headers["Cache-Control"]     = "no-cache, no-store";
        Response.Headers["X-Accel-Buffering"] = "no";   // disable nginx buffering
        Response.Headers["Connection"]        = "keep-alive";

        // Confirm connection immediately so the client knows it's live
        await Response.WriteAsync("event: connected\ndata: {}\n\n", ct);
        await Response.Body.FlushAsync(ct);

        try
        {
            await foreach (var evt in reader.ReadAllAsync(ct))
            {
                await Response.WriteAsync($"event: {evt}\ndata: {{}}\n\n", ct);
                await Response.Body.FlushAsync(ct);
            }
        }
        catch (OperationCanceledException)
        {
            // Client closed the tab / navigated away — expected
        }
        finally
        {
            _events.Unsubscribe(businessId, subId);
        }
    }
}
