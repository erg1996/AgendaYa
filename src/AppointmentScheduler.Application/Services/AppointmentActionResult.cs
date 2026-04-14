using AppointmentScheduler.Domain.Entities;

namespace AppointmentScheduler.Application.Services;

public enum AppointmentActionOutcome
{
    InvalidOrExpired,
    NotFound,
    Confirmed,
    Cancelled,
    AlreadyCancelled,
    AlreadyCompleted
}

public record AppointmentActionResult(
    AppointmentActionOutcome Outcome,
    string? CustomerName,
    string? BusinessName,
    string? ServiceName,
    DateTime? AppointmentDate)
{
    public static AppointmentActionResult InvalidOrExpired() =>
        new(AppointmentActionOutcome.InvalidOrExpired, null, null, null, null);

    public static AppointmentActionResult NotFound() =>
        new(AppointmentActionOutcome.NotFound, null, null, null, null);

    public static AppointmentActionResult Confirmed(Appointment a, string businessName) =>
        new(AppointmentActionOutcome.Confirmed, a.CustomerName, businessName, a.Service?.Name, a.AppointmentDate);

    public static AppointmentActionResult Cancelled(Appointment a, string businessName) =>
        new(AppointmentActionOutcome.Cancelled, a.CustomerName, businessName, a.Service?.Name, a.AppointmentDate);

    public static AppointmentActionResult AlreadyCancelled(Appointment a, string businessName) =>
        new(AppointmentActionOutcome.AlreadyCancelled, a.CustomerName, businessName, a.Service?.Name, a.AppointmentDate);

    public static AppointmentActionResult AlreadyCompleted(Appointment a, string businessName) =>
        new(AppointmentActionOutcome.AlreadyCompleted, a.CustomerName, businessName, a.Service?.Name, a.AppointmentDate);
}
