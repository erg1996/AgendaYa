using AppointmentScheduler.Application.DTOs;
using AppointmentScheduler.Application.Interfaces;
using AppointmentScheduler.Domain.Entities;

namespace AppointmentScheduler.Application.Services;

public class AnalyticsService
{
    private readonly IAppointmentRepository _appointmentRepository;
    private readonly IServiceRepository _serviceRepository;

    public AnalyticsService(IAppointmentRepository appointmentRepository, IServiceRepository serviceRepository)
    {
        _appointmentRepository = appointmentRepository;
        _serviceRepository = serviceRepository;
    }

    public async Task<DashboardAnalytics> GetDashboardAsync(Guid businessId)
    {
        var allAppointments = await _appointmentRepository.GetByBusinessIdAsync(businessId);
        var services = await _serviceRepository.GetByBusinessIdAsync(businessId);

        var now = DateTime.UtcNow;
        var today = now.Date;
        // Week: Mon-Sun of current week
        var weekStart = today.AddDays(-(((int)today.DayOfWeek + 6) % 7));
        var weekEnd = weekStart.AddDays(7);
        var monthStart = new DateTime(today.Year, today.Month, 1);
        var monthEnd = monthStart.AddMonths(1);

        var cancelled = allAppointments.Count(a => a.Status == AppointmentStatus.Cancelled);
        var completed = allAppointments.Count(a => a.Status == AppointmentStatus.Completed);

        // "Active" = only Pending or Confirmed
        var active = allAppointments
            .Where(a => a.Status == AppointmentStatus.Pending || a.Status == AppointmentStatus.Confirmed)
            .ToList();

        var todayCount = active.Count(a => a.AppointmentDate.Date == today);
        var weekCount = active.Count(a => a.AppointmentDate >= weekStart && a.AppointmentDate < weekEnd);
        var monthCount = active.Count(a => a.AppointmentDate >= monthStart && a.AppointmentDate < monthEnd);

        // Revenue: sum of prices from Completed appointments this month
        var serviceMap = services.ToDictionary(s => s.Id, s => s.Price ?? 0m);
        var monthRevenue = allAppointments
            .Where(a => a.Status == AppointmentStatus.Completed
                     && a.AppointmentDate >= monthStart && a.AppointmentDate < monthEnd)
            .Sum(a => serviceMap.TryGetValue(a.ServiceId, out var price) ? price : 0m);

        // Top service by appointment count (active only)
        ServiceStat? topService = null;
        if (active.Count > 0)
        {
            var grouped = active
                .GroupBy(a => a.ServiceId)
                .OrderByDescending(g => g.Count())
                .First();
            var svc = services.FirstOrDefault(s => s.Id == grouped.Key);
            topService = new ServiceStat(svc?.Name ?? "Desconocido", grouped.Count());
        }

        // Busiest and quietest hours (active only)
        HourStat? busiestHour = null;
        HourStat? quietestHour = null;
        if (active.Count > 0)
        {
            var hourGroups = active
                .GroupBy(a => a.AppointmentDate.Hour)
                .Select(g => new HourStat(g.Key, g.Count()))
                .OrderByDescending(h => h.Count)
                .ToList();

            busiestHour = hourGroups.First();
            quietestHour = hourGroups.Last();
        }

        return new DashboardAnalytics(
            active.Count,
            completed,
            cancelled,
            todayCount,
            weekCount,
            monthCount,
            services.Count,
            monthRevenue,
            topService,
            busiestHour,
            quietestHour);
    }
}
