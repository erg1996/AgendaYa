using AppointmentScheduler.Application.Interfaces;
using AppointmentScheduler.Application.Services;
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
}
