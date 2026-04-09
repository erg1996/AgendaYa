namespace AppointmentScheduler.Application.Interfaces;

public interface IEmailService
{
    Task SendAppointmentConfirmationAsync(
        string toEmail,
        string customerName,
        string businessName,
        string serviceName,
        DateTime appointmentDate,
        int durationMinutes,
        string? brandColor = null,
        string? logoUrl = null);

    Task SendAppointmentReminderAsync(
        string toEmail,
        string customerName,
        string businessName,
        string serviceName,
        DateTime appointmentDate,
        int durationMinutes,
        string? brandColor = null,
        string? logoUrl = null);
}
