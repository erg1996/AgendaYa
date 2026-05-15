using AppointmentScheduler.Application.Interfaces;
using AppointmentScheduler.Application.Services;
using AppointmentScheduler.Application.Utils;
using AppointmentScheduler.Domain.Entities;
using AppointmentScheduler.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace AppointmentScheduler.API.BackgroundServices;

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
            try { await SendPendingRemindersAsync(); }
            catch (Exception ex) { _logger.LogError(ex, "Error in reminder background service"); }
            await Task.Delay(TimeSpan.FromHours(1), stoppingToken);
        }
    }

    private async Task SendPendingRemindersAsync()
    {
        using var scope = _services.CreateScope();
        var db             = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var appointmentRepo = scope.ServiceProvider.GetRequiredService<IAppointmentRepository>();
        var emailService   = scope.ServiceProvider.GetRequiredService<IEmailService>();
        var features       = scope.ServiceProvider.GetRequiredService<IOptions<FeatureFlags>>().Value;
        var actionOptions  = scope.ServiceProvider.GetRequiredService<AppointmentActionOptions>();

        var now         = DateTime.UtcNow;
        var windowStart = now.AddHours(22);
        var windowEnd   = now.AddHours(26);

        var appointments = await db.Appointments
            .Include(a => a.Business)
            .Include(a => a.Service)
            .Where(a => a.AppointmentDate >= windowStart
                     && a.AppointmentDate < windowEnd
                     && a.Status != AppointmentStatus.Cancelled
                     && (!a.ReminderSent || (!a.WhatsAppReminderSent && !a.WhatsAppReminderFailed && a.WhatsAppOptIn)))
            .ToListAsync();

        if (appointments.Count == 0) return;

        // Cache WhatsApp sessions per businessId to avoid repeated DB queries
        Dictionary<Guid, WhatsAppSession?>? sessionCache = null;
        IWhatsAppBlacklistRepository? blacklistRepo = null;
        IWhatsAppClient? waClient = null;

        IWhatsAppLogRepository? logRepo = null;
        if (features.WhatsAppAutomation)
        {
            sessionCache  = new();
            blacklistRepo = scope.ServiceProvider.GetRequiredService<IWhatsAppBlacklistRepository>();
            waClient      = scope.ServiceProvider.GetRequiredService<IWhatsAppClient>();
            logRepo       = scope.ServiceProvider.GetRequiredService<IWhatsAppLogRepository>();
        }

        int emailSent = 0, emailSkipped = 0, waSent = 0, waSkipped = 0;

        foreach (var a in appointments)
        {
            // --- Email reminder ---
            if (!a.ReminderSent && a.CustomerEmail != null)
            {
                var claimed = await appointmentRepo.ClaimReminderAsync(a.Id);
                if (claimed)
                {
                    try
                    {
                        await emailService.SendAppointmentReminderAsync(
                            a.CustomerEmail,
                            a.CustomerName,
                            a.Business.Name,
                            a.Service.Name,
                            a.AppointmentDate,
                            a.DurationMinutes,
                            a.Business.BrandColor,
                            a.Business.LogoUrl);
                        emailSent++;
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to send email reminder for appointment {Id}", a.Id);
                    }
                }
                else emailSkipped++;
            }

            // --- WhatsApp reminder ---
            if (!features.WhatsAppAutomation) continue;
            if (!a.WhatsAppOptIn || a.WhatsAppReminderSent || a.WhatsAppReminderFailed) continue;
            if (string.IsNullOrEmpty(a.CustomerPhone)) continue;

            var normalizedPhone = PhoneNormalizer.NormalizeForWaMe(a.CustomerPhone);
            if (normalizedPhone is null) continue;

            // Fetch session (cached)
            if (!sessionCache!.TryGetValue(a.BusinessId, out var session))
            {
                session = await db.WhatsAppSessions.FirstOrDefaultAsync(s => s.BusinessId == a.BusinessId);
                sessionCache[a.BusinessId] = session;
            }

            if (session is null ||
                session.Status != WhatsAppSessionStatus.Connected ||
                !session.AutoRemindersEnabled) continue;

            // Check blacklist
            var isBlocked = await blacklistRepo!.IsBlockedAsync(a.BusinessId, normalizedPhone);
            if (isBlocked) continue;

            var waClaimed = await appointmentRepo.ClaimWhatsAppReminderAsync(a.Id);
            if (!waClaimed) { waSkipped++; continue; }

            try
            {
                var tokenExpires = DateTimeOffset.UtcNow.AddHours(48);
                var confirmUrl   = BuildActionUrl(a.Id, AppointmentAction.Confirm, tokenExpires, actionOptions);
                var cancelUrl    = BuildActionUrl(a.Id, AppointmentAction.Cancel,  tokenExpires, actionOptions);
                var body         = WhatsAppTemplateRenderer.Render(
                    a.Business.WhatsAppReminderTemplate,
                    a.CustomerName, a.Business.Name, a.Service.Name,
                    a.AppointmentDate, confirmUrl, cancelUrl, a.Id);

                var ok = await waClient!.SendMessageAsync(
                    a.BusinessId, normalizedPhone, body, a.Id.ToString(),
                    session.FirstConnectedAt, session.TimeZoneId);

                if (ok)
                {
                    waSent++;
                    await TryLogAsync(logRepo, a.BusinessId, a.Id, normalizedPhone, a.CustomerName, success: true, senderPhone: session.PhoneNumber);
                }
                else
                {
                    await appointmentRepo.MarkWhatsAppReminderFailedAsync(a.Id);
                    await TryLogAsync(logRepo, a.BusinessId, a.Id, normalizedPhone, a.CustomerName, success: false, error: "send failed", senderPhone: session.PhoneNumber);
                    _logger.LogWarning("WhatsApp send failed for appointment {Id}", a.Id);
                    // Poison the cache entry so we skip remaining appointments for this
                    // business this run rather than claiming + failing them individually.
                    sessionCache![a.BusinessId] = new WhatsAppSession { Status = WhatsAppSessionStatus.Disconnected };
                }
            }
            catch (Exception ex)
            {
                await appointmentRepo.MarkWhatsAppReminderFailedAsync(a.Id);
                await TryLogAsync(logRepo, a.BusinessId, a.Id, normalizedPhone, a.CustomerName, success: false, error: ex.Message, senderPhone: session.PhoneNumber);
                _logger.LogError(ex, "Exception sending WhatsApp reminder for appointment {Id}", a.Id);
            }
        }

        _logger.LogInformation(
            "Reminders: email sent={ES} skipped={ESk} | wa sent={WS} skipped={WSk} | total={Total}",
            emailSent, emailSkipped, waSent, waSkipped, appointments.Count);
    }

    private static string BuildActionUrl(Guid appointmentId, AppointmentAction action, DateTimeOffset expires, AppointmentActionOptions opts)
    {
        var token   = AppointmentActionToken.Generate(appointmentId, action, expires, opts.HmacBaseSecret);
        var letter  = action == AppointmentAction.Confirm ? "c" : "x";
        var baseUrl = opts.AppBaseUrl.TrimEnd('/');
        return $"{baseUrl}/a/{letter}/{token}";
    }

    private static async Task TryLogAsync(IWhatsAppLogRepository? repo, Guid businessId, Guid appointmentId,
        string phone, string name, bool success, string? error = null, string? senderPhone = null)
    {
        if (repo is null) return;
        try
        {
            await repo.AddAsync(new Domain.Entities.WhatsAppLog
            {
                Id = Guid.NewGuid(),
                BusinessId = businessId,
                AppointmentId = appointmentId,
                SenderPhone = senderPhone,
                RecipientPhone = phone,
                RecipientName = name,
                MessageType = Domain.Entities.WhatsAppMessageType.AutoReminder,
                Success = success,
                ErrorReason = error,
                SentAt = DateTime.UtcNow.AddHours(-6),
            });
            await repo.SaveChangesAsync();
        }
        catch { }
    }
}
