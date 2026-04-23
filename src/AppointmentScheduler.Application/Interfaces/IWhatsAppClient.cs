using AppointmentScheduler.Application.DTOs;

namespace AppointmentScheduler.Application.Interfaces;

public interface IWhatsAppClient
{
    Task<bool> PingAsync(CancellationToken ct = default);
    Task<StartSessionResult?> StartSessionAsync(Guid businessId, CancellationToken ct = default);
    Task<WhatsAppSessionStatusDto?> GetRemoteStatusAsync(Guid businessId, CancellationToken ct = default);
    Task<byte[]?> GetQrAsync(Guid businessId, CancellationToken ct = default);
    Task<bool> DisconnectAsync(Guid businessId, CancellationToken ct = default);
    Task<bool> SendMessageAsync(Guid businessId, string toPhone, string body, string appointmentId,
        DateTime? firstConnectedAt = null, string? timeZoneId = null, CancellationToken ct = default);
    Task<bool> SendTestMessageAsync(Guid businessId, string toPhone, string body, CancellationToken ct = default);
}
