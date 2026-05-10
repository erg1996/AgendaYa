using AppointmentScheduler.Application.DTOs;
using AppointmentScheduler.Application.Exceptions;
using AppointmentScheduler.Application.Interfaces;
using AppointmentScheduler.Application.Utils;
using AppointmentScheduler.Domain.Entities;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace AppointmentScheduler.Application.Services;

public class AppointmentService
{
    private readonly IAppointmentRepository _appointmentRepository;
    private readonly IServiceRepository _serviceRepository;
    private readonly IBusinessRepository _businessRepository;
    private readonly IWorkingHoursRepository _workingHoursRepository;
    private readonly IEmployeeRepository _employeeRepository;
    private readonly IEmailService _emailService;
    private readonly AppointmentActionOptions _actionOptions;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly FeatureFlags _features;
    private readonly ILogger<AppointmentService> _logger;

    public AppointmentService(
        IAppointmentRepository appointmentRepository,
        IServiceRepository serviceRepository,
        IBusinessRepository businessRepository,
        IWorkingHoursRepository workingHoursRepository,
        IEmployeeRepository employeeRepository,
        IEmailService emailService,
        AppointmentActionOptions actionOptions,
        IServiceScopeFactory scopeFactory,
        IOptions<FeatureFlags> features,
        ILogger<AppointmentService> logger)
    {
        _appointmentRepository = appointmentRepository;
        _serviceRepository = serviceRepository;
        _businessRepository = businessRepository;
        _workingHoursRepository = workingHoursRepository;
        _employeeRepository = employeeRepository;
        _emailService = emailService;
        _actionOptions = actionOptions;
        _scopeFactory = scopeFactory;
        _features = features.Value;
        _logger = logger;
    }

    public async Task<AppointmentResponse> CreateAsync(CreateAppointmentRequest request)
    {
        var business = await _businessRepository.GetByIdAsync(request.BusinessId)
            ?? throw new NotFoundException($"Business with id '{request.BusinessId}' not found.");

        var service = await _serviceRepository.GetByIdAsync(request.ServiceId)
            ?? throw new NotFoundException($"Service with id '{request.ServiceId}' not found.");

        // Resolve which employee handles this appointment.
        var (employee, effectiveDuration) = await ResolveEmployeeAsync(request, service);

        var appointmentDate = request.AppointmentDate;
        var endTime = appointmentDate.AddMinutes(effectiveDuration);

        // Validate slot falls within the employee's working hours for that day.
        int dayOfWeek = (int)appointmentDate.DayOfWeek;
        var workRanges = await _workingHoursRepository.GetByEmployeeIdAndDayAsync(employee.Id, dayOfWeek);

        if (workRanges.Count == 0)
            throw new ConflictException("The employee has no working hours on the requested day.");

        bool withinHours = workRanges.Any(wh =>
            appointmentDate >= appointmentDate.Date + wh.StartTime &&
            endTime <= appointmentDate.Date + wh.EndTime);

        if (!withinHours)
            throw new ConflictException("The appointment falls outside of working hours.");

        var appointment = new Appointment
        {
            Id = Guid.NewGuid(),
            BusinessId = request.BusinessId,
            ServiceId = request.ServiceId,
            EmployeeId = employee.Id,
            CustomerName = request.CustomerName.Trim(),
            CustomerEmail = request.CustomerEmail?.Trim(),
            CustomerPhone = request.CustomerPhone?.Trim(),
            AppointmentDate = appointmentDate,
            DurationMinutes = effectiveDuration,
            Status = AppointmentStatus.Pending,
            WhatsAppOptIn = request.WhatsAppOptIn && !string.IsNullOrEmpty(request.CustomerPhone),
            CreatedAt = DateTime.UtcNow
        };

        // Atomic overlap check + insert under serializable tx (now per-employee).
        var created = await _appointmentRepository.TryCreateWithOverlapCheckAsync(appointment);
        if (!created)
            throw new ConflictException("The requested time slot conflicts with an existing appointment.");

        appointment.Employee = employee;

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

        if (_features.WhatsAppAutomation && appointment.WhatsAppOptIn && !string.IsNullOrEmpty(appointment.CustomerPhone))
        {
            var snapshot = new WhatsAppConfirmationSnapshot(
                appointment.Id, appointment.BusinessId, appointment.CustomerName,
                appointment.CustomerPhone!, appointment.AppointmentDate,
                business.Name, service.Name);
            _ = Task.Run(() => SendWhatsAppConfirmationAsync(snapshot));
        }

        return ToResponse(appointment, employee);
    }

    // Returns (employee, effectiveDurationMinutes). If employeeId not specified,
    // picks the first active employee who offers the service.
    private async Task<(Employee, int)> ResolveEmployeeAsync(CreateAppointmentRequest request, Domain.Entities.Service service)
    {
        if (request.EmployeeId.HasValue)
        {
            var emp = await _employeeRepository.GetByIdWithServicesAsync(request.EmployeeId.Value)
                ?? throw new NotFoundException($"Employee '{request.EmployeeId.Value}' not found.");

            if (emp.BusinessId != request.BusinessId)
                throw new ForbiddenException("Employee does not belong to this business.");

            if (!emp.IsActive)
                throw new ConflictException("The selected employee is not active.");

            var link = emp.EmployeeServices.FirstOrDefault(es => es.ServiceId == request.ServiceId)
                ?? throw new ConflictException("The selected employee does not offer this service.");

            return (emp, link.OverrideDurationMinutes ?? service.DurationMinutes);
        }

        // "Any employee" — pick the first active employee who offers this service.
        var employees = await _employeeRepository.GetByBusinessIdWithServicesAsync(request.BusinessId);
        var candidate = employees.FirstOrDefault(e => e.EmployeeServices.Any(es => es.ServiceId == request.ServiceId))
            ?? throw new ConflictException("No active employee offers this service.");

        var candidateLink = candidate.EmployeeServices.First(es => es.ServiceId == request.ServiceId);
        return (candidate, candidateLink.OverrideDurationMinutes ?? service.DurationMinutes);
    }

    private record WhatsAppConfirmationSnapshot(
        Guid AppointmentId, Guid BusinessId, string CustomerName,
        string CustomerPhone, DateTime AppointmentDate,
        string BusinessName, string ServiceName);

    public async Task<PaginatedResponse<AppointmentResponse>> GetByBusinessIdAsync(Guid businessId, int page = 1, int pageSize = 50)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var (appointments, total) = await _appointmentRepository.GetPaginatedByBusinessIdAsync(businessId, page, pageSize);

        // Hydrate employee names/colors in bulk.
        var empIds = appointments.Select(a => a.EmployeeId).Distinct().ToList();
        var empMap = (await _employeeRepository.GetByBusinessIdAsync(businessId, includeInactive: true))
            .Where(e => empIds.Contains(e.Id))
            .ToDictionary(e => e.Id);

        var items = appointments.Select(a =>
        {
            empMap.TryGetValue(a.EmployeeId, out var emp);
            return ToResponse(a, emp);
        }).ToList();
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
                confirmUrl, cancelUrl, a.Id);
            var url = WhatsAppTemplateRenderer.BuildWaUrl(phone, message);
            return new PendingReminderResponse(a.Id, a.CustomerName, a.CustomerPhone!, a.AppointmentDate, a.Service.Name, a.Business.Name, url, a.WhatsAppReminderSent);
        }).ToList();
    }

    private async Task SendWhatsAppConfirmationAsync(WhatsAppConfirmationSnapshot snapshot)
    {
        // The original request scope is gone by the time this runs — resolve every
        // dependency from a fresh scope so DbContext / typed HttpClient are valid.
        using var scope = _scopeFactory.CreateScope();
        var sp = scope.ServiceProvider;
        var logger = sp.GetRequiredService<ILogger<AppointmentService>>();

        // Retry up to 4 times with 8s delay so that a session reconnecting at the
        // moment of booking (the most common cause of missed confirmations) has time
        // to come back up before we give up.
        const int maxAttempts = 4;
        const int retryDelaySeconds = 8;

        try
        {
            var phone = PhoneNormalizer.NormalizeForWaMe(snapshot.CustomerPhone);
            if (phone is null) return;

            // If no session record exists at all the business has never set up WhatsApp — bail immediately.
            var sessionRepo = sp.GetRequiredService<IWhatsAppSessionRepository>();
            if (await sessionRepo.GetByBusinessIdAsync(snapshot.BusinessId) is null)
            {
                logger.LogInformation("WhatsApp confirmation skipped for {Id}: no session configured",
                    snapshot.AppointmentId);
                return;
            }

            var blacklistRepo = sp.GetRequiredService<IWhatsAppBlacklistRepository>();
            if (await blacklistRepo.IsBlockedAsync(snapshot.BusinessId, phone)) return;

            var cancelUrl = BuildActionUrl(snapshot.AppointmentId, AppointmentAction.Cancel,
                DateTimeOffset.UtcNow.AddHours(72));

            var body = WhatsAppTemplateRenderer.RenderConfirmation(
                snapshot.CustomerName, snapshot.BusinessName, snapshot.ServiceName,
                snapshot.AppointmentDate, cancelUrl);

            var waClient = sp.GetRequiredService<IWhatsAppClient>();

            for (int attempt = 1; attempt <= maxAttempts; attempt++)
            {
                if (await waClient.SendTestMessageAsync(snapshot.BusinessId, phone, body))
                    return;

                if (attempt < maxAttempts)
                {
                    logger.LogInformation(
                        "WhatsApp confirmation attempt {Attempt}/{Max} for {Id} not-ok, retrying in {Delay}s",
                        attempt, maxAttempts, snapshot.AppointmentId, retryDelaySeconds);
                    await Task.Delay(TimeSpan.FromSeconds(retryDelaySeconds));
                }
            }

            logger.LogWarning("WhatsApp confirmation failed after {Max} attempts for {Id}",
                maxAttempts, snapshot.AppointmentId);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "WhatsApp confirmation failed for appointment {Id}", snapshot.AppointmentId);
        }
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

    private static AppointmentResponse ToResponse(Appointment a, Employee? emp = null)
    {
        var effectiveStatus = a.Status;
        if ((a.Status == AppointmentStatus.Pending || a.Status == AppointmentStatus.Confirmed)
            && a.EndTime < DateTime.Now)
        {
            effectiveStatus = AppointmentStatus.Completed;
        }

        var employee = emp ?? a.Employee;
        return new(a.Id, a.BusinessId, a.ServiceId, a.EmployeeId,
            employee?.Name, employee?.Color,
            a.CustomerName, a.CustomerEmail, a.CustomerPhone,
            a.AppointmentDate, a.DurationMinutes, a.EndTime, effectiveStatus.ToString(), a.Notes,
            a.WhatsAppReminderSent, a.CreatedAt);
    }
}
