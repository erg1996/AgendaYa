using AppointmentScheduler.Application.DTOs;
using AppointmentScheduler.Application.Exceptions;
using AppointmentScheduler.Application.Interfaces;
using AppointmentScheduler.Application.Utils;
using AppointmentScheduler.Domain.Entities;

namespace AppointmentScheduler.Application.Services;

public class AppointmentService
{
    private readonly IAppointmentRepository _appointmentRepository;
    private readonly IServiceRepository _serviceRepository;
    private readonly IBusinessRepository _businessRepository;
    private readonly IWorkingHoursRepository _workingHoursRepository;
    private readonly IEmailService _emailService;
    private readonly AppointmentActionOptions _actionOptions;

    public AppointmentService(
        IAppointmentRepository appointmentRepository,
        IServiceRepository serviceRepository,
        IBusinessRepository businessRepository,
        IWorkingHoursRepository workingHoursRepository,
        IEmailService emailService,
        AppointmentActionOptions actionOptions)
    {
        _appointmentRepository = appointmentRepository;
        _serviceRepository = serviceRepository;
        _businessRepository = businessRepository;
        _workingHoursRepository = workingHoursRepository;
        _emailService = emailService;
        _actionOptions = actionOptions;
    }

    public async Task<AppointmentResponse> CreateAsync(CreateAppointmentRequest request)
    {
        var business = await _businessRepository.GetByIdAsync(request.BusinessId)
            ?? throw new NotFoundException($"Business with id '{request.BusinessId}' not found.");

        var service = await _serviceRepository.GetByIdAsync(request.ServiceId)
            ?? throw new NotFoundException($"Service with id '{request.ServiceId}' not found.");

        var appointmentDate = request.AppointmentDate;
        var endTime = appointmentDate.AddMinutes(service.DurationMinutes);

        // Validate within working hours
        int dayOfWeek = (int)appointmentDate.DayOfWeek;
        var workingHoursList = await _workingHoursRepository.GetByBusinessIdAndDayAsync(request.BusinessId, dayOfWeek);

        if (workingHoursList.Count == 0)
            throw new ConflictException("The business is closed on the requested day.");

        var wh = workingHoursList[0];
        var dayStart = appointmentDate.Date + wh.StartTime;
        var dayEnd = appointmentDate.Date + wh.EndTime;

        if (appointmentDate < dayStart || endTime > dayEnd)
            throw new ConflictException("The appointment falls outside of working hours.");

        var appointment = new Appointment
        {
            Id = Guid.NewGuid(),
            BusinessId = request.BusinessId,
            ServiceId = request.ServiceId,
            CustomerName = request.CustomerName.Trim(),
            CustomerEmail = request.CustomerEmail?.Trim(),
            CustomerPhone = request.CustomerPhone?.Trim(),
            AppointmentDate = appointmentDate,
            DurationMinutes = service.DurationMinutes,
            Status = AppointmentStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };

        // Atomic overlap check + insert under a serializable transaction so two
        // concurrent bookings cannot both win the same slot.
        var created = await _appointmentRepository.TryCreateWithOverlapCheckAsync(appointment);
        if (!created)
            throw new ConflictException("The requested time slot conflicts with an existing appointment.");

        // Send confirmation email (fire-and-forget)
        if (!string.IsNullOrWhiteSpace(appointment.CustomerEmail))
        {
            _ = _emailService.SendAppointmentConfirmationAsync(
                appointment.CustomerEmail,
                appointment.CustomerName,
                business.Name,
                service.Name,
                appointment.AppointmentDate,
                appointment.DurationMinutes,
                business.BrandColor,
                business.LogoUrl);
        }

        return ToResponse(appointment);
    }

    public async Task<PaginatedResponse<AppointmentResponse>> GetByBusinessIdAsync(Guid businessId, int page = 1, int pageSize = 50)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var (appointments, total) = await _appointmentRepository.GetPaginatedByBusinessIdAsync(businessId, page, pageSize);
        var items = appointments.Select(ToResponse).ToList();
        return new PaginatedResponse<AppointmentResponse>(items, total, page, pageSize);
    }

    public async Task<AppointmentResponse> UpdateStatusAsync(Guid id, Guid businessId, string statusStr)
    {
        var appointment = await _appointmentRepository.GetByIdAsync(id)
            ?? throw new NotFoundException($"Appointment with id '{id}' not found.");

        if (appointment.BusinessId != businessId)
            throw new ForbiddenException("Appointment does not belong to this business.");

        if (!Enum.TryParse<AppointmentStatus>(statusStr, out var newStatus))
            throw new ConflictException($"Invalid status: {statusStr}");

        appointment.Status = newStatus;
        await _appointmentRepository.SaveChangesAsync();

        return ToResponse(appointment);
    }

    public async Task<AppointmentResponse> UpdateNotesAsync(Guid id, Guid businessId, string? notes)
    {
        var appointment = await _appointmentRepository.GetByIdAsync(id)
            ?? throw new NotFoundException($"Appointment with id '{id}' not found.");

        if (appointment.BusinessId != businessId)
            throw new ForbiddenException("Appointment does not belong to this business.");

        appointment.Notes = notes?.Trim();
        await _appointmentRepository.SaveChangesAsync();

        return ToResponse(appointment);
    }

    public async Task<List<PendingReminderResponse>> GetPendingWhatsAppRemindersAsync(Guid businessId)
    {
        var (from, to) = GetTomorrowUtcWindow();
        var appointments = await _appointmentRepository.GetPendingWhatsAppRemindersByBusinessAsync(businessId, from, to);

        var business = await _businessRepository.GetByIdAsync(businessId);
        var template = business?.WhatsAppReminderTemplate;
        // Tokens expire 48h after generation — enough time to click the link after
        // receiving the message, short enough that a leaked token goes stale fast.
        var tokenExpires = DateTimeOffset.UtcNow.AddHours(48);

        return appointments.Select(a =>
        {
            var phone = PhoneNormalizer.NormalizeForWaMe(a.CustomerPhone)!;
            var confirmUrl = BuildActionUrl(a.Id, AppointmentAction.Confirm, tokenExpires);
            var cancelUrl = BuildActionUrl(a.Id, AppointmentAction.Cancel, tokenExpires);
            var message = WhatsAppTemplateRenderer.Render(
                template, a.CustomerName, a.Business.Name, a.Service.Name, a.AppointmentDate,
                confirmUrl, cancelUrl);
            var url = WhatsAppTemplateRenderer.BuildWaUrl(phone, message);
            return new PendingReminderResponse(a.Id, a.CustomerName, a.CustomerPhone!, a.AppointmentDate, a.Service.Name, a.Business.Name, url, a.WhatsAppReminderSent);
        }).ToList();
    }

    private string BuildActionUrl(Guid appointmentId, AppointmentAction action, DateTimeOffset expires)
    {
        var token = AppointmentActionToken.Generate(appointmentId, action, expires, _actionOptions.HmacBaseSecret);
        var letter = action == AppointmentAction.Confirm ? "c" : "x";
        var baseUrl = _actionOptions.AppBaseUrl.TrimEnd('/');
        return $"{baseUrl}/a/{letter}/{token}";
    }

    public async Task<AppointmentActionResult> ApplyActionByTokenAsync(string token)
    {
        if (!AppointmentActionToken.TryValidate(token, _actionOptions.HmacBaseSecret, DateTimeOffset.UtcNow, out var appointmentId, out var action))
            return AppointmentActionResult.InvalidOrExpired();

        var appointment = await _appointmentRepository.GetByIdAsync(appointmentId);
        if (appointment == null)
            return AppointmentActionResult.NotFound();

        var business = await _businessRepository.GetByIdAsync(appointment.BusinessId);
        var businessName = business?.Name ?? "";

        // No-op if already in the target state (idempotent — safe to click twice).
        if (action == AppointmentAction.Confirm)
        {
            if (appointment.Status == AppointmentStatus.Cancelled)
                return AppointmentActionResult.AlreadyCancelled(appointment, businessName);
            if (appointment.Status == AppointmentStatus.Completed)
                return AppointmentActionResult.AlreadyCompleted(appointment, businessName);

            if (appointment.Status != AppointmentStatus.Confirmed)
            {
                appointment.Status = AppointmentStatus.Confirmed;
                await _appointmentRepository.SaveChangesAsync();
            }
            return AppointmentActionResult.Confirmed(appointment, businessName);
        }
        else
        {
            if (appointment.Status == AppointmentStatus.Completed)
                return AppointmentActionResult.AlreadyCompleted(appointment, businessName);

            if (appointment.Status != AppointmentStatus.Cancelled)
            {
                appointment.Status = AppointmentStatus.Cancelled;
                await _appointmentRepository.SaveChangesAsync();
            }
            return AppointmentActionResult.Cancelled(appointment, businessName);
        }
    }

    public async Task MarkWhatsAppReminderSentAsync(Guid id, Guid businessId)
    {
        var appointment = await _appointmentRepository.GetByIdAsync(id)
            ?? throw new NotFoundException($"Appointment '{id}' not found.");

        if (appointment.BusinessId != businessId)
            throw new ForbiddenException("Appointment does not belong to this business.");

        appointment.WhatsAppReminderSent = true;
        await _appointmentRepository.SaveChangesAsync();
    }

    // Returns UTC window for "tomorrow" in El Salvador (UTC-6, no DST)
    private static (DateTime From, DateTime To) GetTomorrowUtcWindow()
    {
        TimeZoneInfo tz;
        try { tz = TimeZoneInfo.FindSystemTimeZoneById("America/El_Salvador"); }
        catch { tz = TimeZoneInfo.FindSystemTimeZoneById("Central America Standard Time"); }

        var localNow = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, tz);
        var tomorrowLocalMidnight = localNow.Date.AddDays(1);
        var from = TimeZoneInfo.ConvertTimeToUtc(tomorrowLocalMidnight, tz);
        var to = from.AddDays(1);
        return (from, to);
    }

    private static AppointmentResponse ToResponse(Appointment a)
    {
        var effectiveStatus = a.Status;
        if ((a.Status == AppointmentStatus.Pending || a.Status == AppointmentStatus.Confirmed)
            && a.EndTime < DateTime.Now)
        {
            effectiveStatus = AppointmentStatus.Completed;
        }

        return new(a.Id, a.BusinessId, a.ServiceId, a.CustomerName, a.CustomerEmail, a.CustomerPhone,
            a.AppointmentDate, a.DurationMinutes, a.EndTime, effectiveStatus.ToString(), a.Notes,
            a.WhatsAppReminderSent, a.CreatedAt);
    }
}
