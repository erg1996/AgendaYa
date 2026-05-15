namespace AppointmentScheduler.Application.DTOs;

public record WhatsAppLogResponse(
    Guid Id,
    Guid? AppointmentId,
    string? SenderPhone,
    string RecipientPhone,
    string RecipientName,
    string MessageType,
    bool Success,
    string? ErrorReason,
    DateTime SentAt);
