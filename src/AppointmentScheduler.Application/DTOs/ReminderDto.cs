namespace AppointmentScheduler.Application.DTOs;

public record PendingReminderResponse(
    Guid AppointmentId,
    string CustomerName,
    string CustomerPhone,
    DateTime AppointmentDateUtc,
    string ServiceName,
    string BusinessName,
    string WhatsAppUrl,
    bool WhatsAppReminderSent);
