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
        // Per-request timeouts are applied via WithTimeout() helper.
        // InfiniteTimeSpan disables the global limit so per-request tokens take effect.
        _http.Timeout = Timeout.InfiniteTimeSpan;
    }

    public async Task<bool> PingAsync(CancellationToken ct = default)
    {
        try
        {
            using var t = WithTimeout(ct, seconds: 10);
            var res = await _http.GetAsync("ping", t.Token);
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
            using var t = WithTimeout(ct, seconds: 10);
            var res = await _http.PostAsync($"sessions/{businessId}/start", content: null, t.Token);
            if (!res.IsSuccessStatusCode)
            {
                _logger.LogWarning("WhatsApp start session returned {Status} for {BusinessId}", res.StatusCode, businessId);
                return null;
            }
            var payload = await res.Content.ReadFromJsonAsync<StartSessionResponse>(cancellationToken: t.Token);
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
            using var t = WithTimeout(ct, seconds: 10);
            var res = await _http.GetAsync($"sessions/{businessId}/status", t.Token);
            if (res.StatusCode == HttpStatusCode.NotFound) return null;
            if (!res.IsSuccessStatusCode) return null;
            var payload = await res.Content.ReadFromJsonAsync<StatusResponse>(cancellationToken: t.Token);
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
            using var t = WithTimeout(ct, seconds: 10);
            var res = await _http.GetAsync($"sessions/{businessId}/qr", t.Token);
            if (!res.IsSuccessStatusCode) return null;
            return await res.Content.ReadAsByteArrayAsync(t.Token);
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
            using var t = WithTimeout(ct, seconds: 10);
            var res = await _http.DeleteAsync($"sessions/{businessId}", t.Token);
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
            // Rate limiter enforces 45-120s inter-message delays + typing indicator;
            // allow 3 minutes per message so queued sends don't timeout.
            using var t = WithTimeout(ct, seconds: 180);
            var payload = new { to = toPhone, body, appointmentId, firstConnectedAt, timeZoneId };
            var res = await _http.PostAsJsonAsync($"sessions/{businessId}/send", payload, t.Token);
            if (res.IsSuccessStatusCode) return true;

            var detail = await SafeReadBodyAsync(res, t.Token);
            _logger.LogWarning(
                "WhatsApp send returned {Status} for {BusinessId} to {Phone}. Body: {Body}",
                (int)res.StatusCode, businessId, toPhone, detail);
            return false;
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
            using var t = WithTimeout(ct, seconds: 15);
            var payload = new { to = toPhone, body };
            var res = await _http.PostAsJsonAsync($"sessions/{businessId}/send-test", payload, t.Token);
            if (res.IsSuccessStatusCode) return true;

            var detail = await SafeReadBodyAsync(res, t.Token);
            _logger.LogWarning(
                "WhatsApp send-test returned {Status} for {BusinessId} to {Phone}. Body: {Body}",
                (int)res.StatusCode, businessId, toPhone, detail);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "WhatsApp send test message failed for {BusinessId}", businessId);
            return false;
        }
    }

    private static async Task<string> SafeReadBodyAsync(HttpResponseMessage res, CancellationToken ct)
    {
        try
        {
            var s = await res.Content.ReadAsStringAsync(ct);
            return s.Length > 500 ? s[..500] : s;
        }
        catch
        {
            return "<unreadable>";
        }
    }

    private static CancellationTokenSource WithTimeout(CancellationToken ct, int seconds)
    {
        var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        cts.CancelAfter(TimeSpan.FromSeconds(seconds));
        return cts;
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
