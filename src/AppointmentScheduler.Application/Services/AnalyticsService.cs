using AppointmentScheduler.Application.DTOs;
using AppointmentScheduler.Application.Interfaces;

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
        var now = DateTime.UtcNow;
        var today = now.Date;
        var weekStart = today.AddDays(-(((int)today.DayOfWeek + 6) % 7));
        var weekEnd = weekStart.AddDays(7);
        var monthStart = new DateTime(today.Year, today.Month, 1);
        var monthEnd = monthStart.AddMonths(1);

        var agg = await _appointmentRepository.GetDashboardAggregatesAsync(
            businessId, today, weekStart, weekEnd, monthStart, monthEnd);

        var totalServices = await _serviceRepository.CountByBusinessIdAsync(businessId);

        ServiceStat? topService = null;
        if (agg.TopServiceId is Guid topId)
        {
            var svc = await _serviceRepository.GetByIdAsync(topId);
            topService = new ServiceStat(svc?.Name ?? "Desconocido", agg.TopServiceCount);
        }

        HourStat? busiestHour = agg.BusiestHour is int bh ? new HourStat(bh, agg.BusiestHourCount) : null;
        HourStat? quietestHour = agg.QuietestHour is int qh ? new HourStat(qh, agg.QuietestHourCount) : null;

        return new DashboardAnalytics(
            agg.ActiveCount,
            agg.CompletedCount,
            agg.CancelledCount,
            agg.TodayActiveCount,
            agg.WeekActiveCount,
            agg.MonthActiveCount,
            totalServices,
            agg.MonthRevenue,
            topService,
            busiestHour,
            quietestHour);
    }
}
