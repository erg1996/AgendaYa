namespace AppointmentScheduler.Application.DTOs;

public record CreateBlockedDateRequest(
    Guid BusinessId,
    DateTime Date,
    string Reason);

public record BlockedDateResponse(
    Guid Id,
    Guid BusinessId,
    DateTime Date,
    string Reason);
