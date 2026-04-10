using System.Net;
using System.Net.Mail;
using AppointmentScheduler.Application.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace AppointmentScheduler.Infrastructure.Services;

public class SmtpEmailService : IEmailService
{
    private readonly IConfiguration _config;
    private readonly ILogger<SmtpEmailService> _logger;

    public SmtpEmailService(IConfiguration config, ILogger<SmtpEmailService> logger)
    {
        _config = config;
        _logger = logger;
    }

    public async Task SendAppointmentConfirmationAsync(
        string toEmail,
        string customerName,
        string businessName,
        string serviceName,
        DateTime appointmentDate,
        int durationMinutes,
        string? brandColor = null,
        string? logoUrl = null)
    {
        // Read SMTP config from environment variables only (never from config files)
        var smtpHost = Environment.GetEnvironmentVariable("SMTP_HOST");
        if (string.IsNullOrEmpty(smtpHost))
        {
            _logger.LogWarning("Email not configured (SMTP_HOST env var missing). Skipping email to {Email}", toEmail);
            return;
        }

        var smtpPort = int.Parse(Environment.GetEnvironmentVariable("SMTP_PORT") ?? "587");
        var fromEmail = Environment.GetEnvironmentVariable("SMTP_FROM") ?? "noreply@agendaya.app";
        var fromName = Environment.GetEnvironmentVariable("SMTP_FROM_NAME") ?? "AgendaYa";
        var username = Environment.GetEnvironmentVariable("SMTP_USERNAME") ?? "";
        var password = Environment.GetEnvironmentVariable("SMTP_PASSWORD") ?? "";

        var endTime = appointmentDate.AddMinutes(durationMinutes);
        var dateStr = appointmentDate.ToString("dddd, dd 'de' MMMM 'de' yyyy", new System.Globalization.CultureInfo("es"));
        var timeStr = $"{appointmentDate:HH:mm} — {endTime:HH:mm}";

        var headerColor = brandColor ?? "#4F46E5";
        var logoHtml = !string.IsNullOrEmpty(logoUrl)
            ? $"<img src='{logoUrl}' alt='{businessName}' style='width:60px;height:60px;border-radius:12px;object-fit:cover;margin-bottom:12px;border:2px solid rgba(255,255,255,0.3);'/><br/>"
            : "";

        var subject = $"Cita agendada - {businessName}";
        var body = $@"
<html>
<body style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;'>
    <div style='background: {headerColor}; color: white; padding: 24px 20px; border-radius: 12px 12px 0 0; text-align: center;'>
        {logoHtml}
        <h1 style='margin: 0; font-size: 24px;'>{businessName}</h1>
        <p style='margin: 5px 0 0; opacity: 0.9;'>Cita Agendada</p>
    </div>
    <div style='background: #F9FAFB; padding: 24px; border: 1px solid #E5E7EB; border-top: none; border-radius: 0 0 12px 12px;'>
        <p style='color: #374151; font-size: 16px;'>Hola <strong>{customerName}</strong>,</p>
        <p style='color: #6B7280;'>Tu cita ha sido agendada y esta pendiente de confirmacion:</p>
        <div style='background: white; border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px; margin: 16px 0;'>
            <table style='width: 100%; border-collapse: collapse;'>
                <tr>
                    <td style='padding: 8px 0; color: #6B7280; width: 120px;'>Servicio:</td>
                    <td style='padding: 8px 0; color: #111827; font-weight: 600;'>{serviceName}</td>
                </tr>
                <tr>
                    <td style='padding: 8px 0; color: #6B7280;'>Fecha:</td>
                    <td style='padding: 8px 0; color: #111827; font-weight: 600;'>{dateStr}</td>
                </tr>
                <tr>
                    <td style='padding: 8px 0; color: #6B7280;'>Hora:</td>
                    <td style='padding: 8px 0; color: #111827; font-weight: 600;'>{timeStr}</td>
                </tr>
                <tr>
                    <td style='padding: 8px 0; color: #6B7280;'>Duración:</td>
                    <td style='padding: 8px 0; color: #111827; font-weight: 600;'>{durationMinutes} minutos</td>
                </tr>
            </table>
        </div>
        <p style='color: #6B7280; font-size: 14px; margin-top: 20px;'>
            Si necesitas cancelar o reprogramar tu cita, por favor contacta directamente con {businessName}.
        </p>
    </div>
    <p style='color: #9CA3AF; font-size: 12px; text-align: center; margin-top: 16px;'>
        Enviado por AgendaYa
    </p>
</body>
</html>";

        try
        {
            using var client = new SmtpClient(smtpHost, smtpPort);
            client.EnableSsl = true;
            if (!string.IsNullOrEmpty(username))
                client.Credentials = new NetworkCredential(username, password);

            var message = new MailMessage
            {
                From = new MailAddress(fromEmail, fromName),
                Subject = subject,
                Body = body,
                IsBodyHtml = true
            };
            message.To.Add(new MailAddress(toEmail, customerName));

            await client.SendMailAsync(message);
            _logger.LogInformation("Confirmation email sent to {Email}", toEmail);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send confirmation email to {Email}", toEmail);
            // Don't throw — email failure shouldn't block appointment creation
        }
    }

    public async Task SendAppointmentReminderAsync(
        string toEmail,
        string customerName,
        string businessName,
        string serviceName,
        DateTime appointmentDate,
        int durationMinutes,
        string? brandColor = null,
        string? logoUrl = null)
    {
        // Read SMTP config from environment variables only (never from config files)
        var smtpHost = Environment.GetEnvironmentVariable("SMTP_HOST");
        if (string.IsNullOrEmpty(smtpHost))
        {
            _logger.LogWarning("Email not configured (SMTP_HOST env var missing). Skipping reminder to {Email}", toEmail);
            return;
        }

        var smtpPort = int.Parse(Environment.GetEnvironmentVariable("SMTP_PORT") ?? "587");
        var fromEmail = Environment.GetEnvironmentVariable("SMTP_FROM") ?? "noreply@agendaya.app";
        var fromName = Environment.GetEnvironmentVariable("SMTP_FROM_NAME") ?? "AgendaYa";
        var username = Environment.GetEnvironmentVariable("SMTP_USERNAME") ?? "";
        var password = Environment.GetEnvironmentVariable("SMTP_PASSWORD") ?? "";

        var endTime = appointmentDate.AddMinutes(durationMinutes);
        var dateStr = appointmentDate.ToString("dddd, dd 'de' MMMM 'de' yyyy", new System.Globalization.CultureInfo("es"));
        var timeStr = $"{appointmentDate:HH:mm} — {endTime:HH:mm}";
        var headerColor = brandColor ?? "#4F46E5";
        var logoHtml = !string.IsNullOrEmpty(logoUrl)
            ? $"<img src='{logoUrl}' alt='{businessName}' style='width:60px;height:60px;border-radius:12px;object-fit:cover;margin-bottom:12px;border:2px solid rgba(255,255,255,0.3);'/><br/>"
            : "";

        var subject = $"Recordatorio de cita - {businessName}";
        var body = $@"
<html>
<body style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;'>
    <div style='background: {headerColor}; color: white; padding: 24px 20px; border-radius: 12px 12px 0 0; text-align: center;'>
        {logoHtml}
        <h1 style='margin: 0; font-size: 24px;'>{businessName}</h1>
        <p style='margin: 5px 0 0; opacity: 0.9;'>Recordatorio de Cita</p>
    </div>
    <div style='background: #F9FAFB; padding: 24px; border: 1px solid #E5E7EB; border-top: none; border-radius: 0 0 12px 12px;'>
        <p style='color: #374151; font-size: 16px;'>Hola <strong>{customerName}</strong>,</p>
        <p style='color: #6B7280;'>Te recordamos que tienes una cita <strong>manana</strong>:</p>
        <div style='background: white; border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px; margin: 16px 0;'>
            <table style='width: 100%; border-collapse: collapse;'>
                <tr>
                    <td style='padding: 8px 0; color: #6B7280; width: 120px;'>Servicio:</td>
                    <td style='padding: 8px 0; color: #111827; font-weight: 600;'>{serviceName}</td>
                </tr>
                <tr>
                    <td style='padding: 8px 0; color: #6B7280;'>Fecha:</td>
                    <td style='padding: 8px 0; color: #111827; font-weight: 600;'>{dateStr}</td>
                </tr>
                <tr>
                    <td style='padding: 8px 0; color: #6B7280;'>Hora:</td>
                    <td style='padding: 8px 0; color: #111827; font-weight: 600;'>{timeStr}</td>
                </tr>
            </table>
        </div>
        <p style='color: #6B7280; font-size: 14px; margin-top: 20px;'>
            Si necesitas cancelar o reprogramar, por favor contacta directamente con {businessName}.
        </p>
    </div>
    <p style='color: #9CA3AF; font-size: 12px; text-align: center; margin-top: 16px;'>
        Enviado por AgendaYa
    </p>
</body>
</html>";

        try
        {
            using var smtp = new SmtpClient(smtpHost, smtpPort);
            smtp.EnableSsl = true;
            if (!string.IsNullOrEmpty(username))
                smtp.Credentials = new NetworkCredential(username, password);

            var message = new MailMessage
            {
                From = new MailAddress(fromEmail, fromName),
                Subject = subject,
                Body = body,
                IsBodyHtml = true
            };
            message.To.Add(new MailAddress(toEmail, customerName));

            await smtp.SendMailAsync(message);
            _logger.LogInformation("Reminder email sent to {Email}", toEmail);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send reminder email to {Email}", toEmail);
        }
    }
}
