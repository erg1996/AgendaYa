using AppointmentScheduler.Application.Interfaces;
using AppointmentScheduler.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AppointmentScheduler.API.BackgroundServices;

/// <summary>
/// Runs every hour and sends reminder emails to customers with appointments in the next 22-26h window.
/// Uses ReminderSent flag to avoid duplicate sends.
/// </summary>
public class ReminderBackgroundService : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly ILogger<ReminderBackgroundService> _logger;

    public ReminderBackgroundService(IServiceProvider services, ILogger<ReminderBackgroundService> logger)
    {
        _services = services;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await SendPendingRemindersAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in reminder background service");
            }

            // Run every hour
            await Task.Delay(TimeSpan.FromHours(1), stoppingToken);
        }
    }

    private async Task SendPendingRemindersAsync()
    {
        using var scope = _services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var emailService = scope.ServiceProvider.GetRequiredService<IEmailService>();

        var now = DateTime.UtcNow;
        // Window: 22h to 26h from now (4h window to account for service restarts/delays)
        var windowStart = now.AddHours(22);
        var windowEnd = now.AddHours(26);

        var appointments = await db.Appointments
            .Include(a => a.Business)
            .Include(a => a.Service)
            .Where(a => a.AppointmentDate >= windowStart
                     && a.AppointmentDate < windowEnd
                     && !a.ReminderSent
                     && a.Status != Domain.Entities.AppointmentStatus.Cancelled
                     && a.CustomerEmail != null)
            .ToListAsync();

        if (appointments.Count == 0) return;

        _logger.LogInformation("Sending {Count} reminder emails", appointments.Count);

        foreach (var a in appointments)
        {
            await emailService.SendAppointmentReminderAsync(
                a.CustomerEmail!,
                a.CustomerName,
                a.Business.Name,
                a.Service.Name,
                a.AppointmentDate,
                a.DurationMinutes,
                a.Business.BrandColor,
                a.Business.LogoUrl);

            a.ReminderSent = true;
        }

        await db.SaveChangesAsync();
        _logger.LogInformation("Reminder emails sent for {Count} appointments", appointments.Count);
    }
}
