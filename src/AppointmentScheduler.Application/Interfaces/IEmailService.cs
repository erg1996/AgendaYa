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

    Task SendNewBookingNotificationAsync(
        string toEmail,
        string businessName,
        string customerName,
        string serviceName,
        string employeeName,
        DateTime appointmentDate,
        int durationMinutes,
        string? customerPhone = null,
        string? customerEmail = null,
        string? brandColor = null,
        string? logoUrl = null);

    Task SendWhatsAppSessionDownAsync(
        string toEmail,
        string businessName,
        string? phoneNumber,
        string estado,
        CancellationToken ct = default);
}
