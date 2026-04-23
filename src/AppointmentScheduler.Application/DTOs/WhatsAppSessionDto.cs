using AppointmentScheduler.Domain.Entities;

namespace AppointmentScheduler.Application.DTOs;

public record WhatsAppSessionStatusDto(
    WhatsAppSessionStatus Status,
    string? PhoneNumber,
    DateTime? LastConnectedAt,
    DateTime? LastQrGeneratedAt,
    string? LastError,
    bool AutoRemindersEnabled,
    string? TimeZoneId = null);

public record StartSessionResult(WhatsAppSessionStatus Status, string? LastError);

public record UpdateSessionSettingsRequest(bool AutoRemindersEnabled, string? TimeZoneId = null);
public record SendTestRequest(string? To, string? Body);
