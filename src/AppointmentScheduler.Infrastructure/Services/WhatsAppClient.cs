using System.Net;
using System.Net.Http.Json;
using AppointmentScheduler.Application.DTOs;
using AppointmentScheduler.Application.Interfaces;
using AppointmentScheduler.Application.Services;
using AppointmentScheduler.Domain.Entities;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace AppointmentScheduler.Infrastructure.Services;

public class WhatsAppClient : IWhatsAppClient
{
    private readonly HttpClient _http;
    private readonly ILogger<WhatsAppClient> _logger;

    public WhatsAppClient(HttpClient http, IOptions<WhatsAppOptions> options, ILogger<WhatsAppClient> logger)
    {
        _http = http;
        _logger = logger;

        var opts = options.Value;
        if (!string.IsNullOrWhiteSpace(opts.ServiceUrl))
        {
            _http.BaseAddress = new Uri(opts.ServiceUrl.TrimEnd('/') + "/");
        }
        if (!string.IsNullOrWhiteSpace(opts.InternalSecret))
        {
            _http.DefaultRequestHeaders.Remove("X-Internal-Secret");
            _http.DefaultRequestHeaders.Add("X-Internal-Secret", opts.InternalSecret);
        }
        _http.Timeout = TimeSpan.FromSeconds(5);
    }

    public async Task<bool> PingAsync(CancellationToken ct = default)
    {
        try
        {
            var res = await _http.GetAsync("ping", ct);
            return res.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "WhatsApp service ping failed");
            return false;
        }
    }

    public async Task<StartSessionResult?> StartSessionAsync(Guid businessId, CancellationToken ct = default)
    {
        try
        {
            var res = await _http.PostAsync($"sessions/{businessId}/start", content: null, ct);
            if (!res.IsSuccessStatusCode)
            {
                _logger.LogWarning("WhatsApp start session returned {Status} for {BusinessId}", res.StatusCode, businessId);
                return null;
            }
            var payload = await res.Content.ReadFromJsonAsync<StartSessionResponse>(cancellationToken: ct);
            if (payload is null) return null;
            return new StartSessionResult(ParseStatus(payload.status), payload.lastError);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "WhatsApp start session failed for {BusinessId}", businessId);
            return null;
        }
    }

    public async Task<WhatsAppSessionStatusDto?> GetRemoteStatusAsync(Guid businessId, CancellationToken ct = default)
    {
        try
        {
            var res = await _http.GetAsync($"sessions/{businessId}/status", ct);
            if (res.StatusCode == HttpStatusCode.NotFound) return null;
            if (!res.IsSuccessStatusCode) return null;
            var payload = await res.Content.ReadFromJsonAsync<StatusResponse>(cancellationToken: ct);
            if (payload is null) return null;
            return new WhatsAppSessionStatusDto(
                ParseStatus(payload.status),
                payload.phoneNumber,
                payload.lastConnectedAt,
                payload.lastQrGeneratedAt,
                payload.lastError,
                AutoRemindersEnabled: false);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "WhatsApp get status failed for {BusinessId}", businessId);
            return null;
        }
    }

    public async Task<byte[]?> GetQrAsync(Guid businessId, CancellationToken ct = default)
    {
        try
        {
            var res = await _http.GetAsync($"sessions/{businessId}/qr", ct);
            if (!res.IsSuccessStatusCode) return null;
            return await res.Content.ReadAsByteArrayAsync(ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "WhatsApp get QR failed for {BusinessId}", businessId);
            return null;
        }
    }

    public async Task<bool> DisconnectAsync(Guid businessId, CancellationToken ct = default)
    {
        try
        {
            var res = await _http.DeleteAsync($"sessions/{businessId}", ct);
            return res.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "WhatsApp disconnect failed for {BusinessId}", businessId);
            return false;
        }
    }

    public async Task<bool> SendMessageAsync(Guid businessId, string toPhone, string body, string appointmentId,
        DateTime? firstConnectedAt = null, string? timeZoneId = null, CancellationToken ct = default)
    {
        try
        {
            var payload = new { to = toPhone, body, appointmentId, firstConnectedAt, timeZoneId };
            var res = await _http.PostAsJsonAsync($"sessions/{businessId}/send", payload, ct);
            return res.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "WhatsApp send message failed for {BusinessId} to {Phone}", businessId, toPhone);
            return false;
        }
    }

    public async Task<bool> SendTestMessageAsync(Guid businessId, string toPhone, string body, CancellationToken ct = default)
    {
        try
        {
            var payload = new { to = toPhone, body };
            var res = await _http.PostAsJsonAsync($"sessions/{businessId}/send-test", payload, ct);
            return res.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "WhatsApp send test message failed for {BusinessId}", businessId);
            return false;
        }
    }

    private static WhatsAppSessionStatus ParseStatus(string? raw) => raw?.ToLowerInvariant() switch
    {
        "starting" => WhatsAppSessionStatus.Starting,
        "waiting_qr" => WhatsAppSessionStatus.WaitingQr,
        "connected" => WhatsAppSessionStatus.Connected,
        "failed" => WhatsAppSessionStatus.Failed,
        _ => WhatsAppSessionStatus.Disconnected
    };

    private record StartSessionResponse(string? status, string? lastError);
    private record StatusResponse(string? status, string? phoneNumber, DateTime? lastConnectedAt, DateTime? lastQrGeneratedAt, string? lastError);
}
