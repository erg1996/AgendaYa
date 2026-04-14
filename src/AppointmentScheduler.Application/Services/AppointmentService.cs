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

    public AppointmentService(
        IAppointmentRepository appointmentRepository,
        IServiceRepository serviceRepository,
        IBusinessRepository businessRepository,
        IWorkingHoursRepository workingHoursRepository,
        IEmailService emailService)
    {
        _appointmentRepository = appointmentRepository;
        _serviceRepository = serviceRepository;
        _businessRepository = businessRepository;
        _workingHoursRepository = workingHoursRepository;
        _emailService = emailService;
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

        // Validate no overlap (only non-cancelled appointments)
        var existingAppointments = await _appointmentRepository.GetByBusinessIdAndDateAsync(request.BusinessId, appointmentDate);

        bool hasConflict = existingAppointments
            .Where(a => a.Status != AppointmentStatus.Cancelled)
            .Any(a => appointmentDate < a.EndTime && a.AppointmentDate < endTime);

        if (hasConflict)
            throw new ConflictException("The requested time slot conflicts with an existing appointment.");

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

        await _appointmentRepository.AddAsync(appointment);
        await _appointmentRepository.SaveChangesAsync();

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

        return appointments.Select(a =>
        {
            var phone = PhoneNormalizer.NormalizeForWaMe(a.CustomerPhone)!;
            var message = WhatsAppTemplateRenderer.Render(template, a.CustomerName, a.Business.Name, a.Service.Name, a.AppointmentDate);
            var url = WhatsAppTemplateRenderer.BuildWaUrl(phone, message);
            return new PendingReminderResponse(a.Id, a.CustomerName, a.CustomerPhone!, a.AppointmentDate, a.Service.Name, a.Business.Name, url, a.WhatsAppReminderSent);
        }).ToList();
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
