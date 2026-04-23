using AppointmentScheduler.Domain.Entities;

namespace AppointmentScheduler.Application.Interfaces;

public record DashboardAggregates(
    int ActiveCount,
    int CompletedCount,
    int CancelledCount,
    int TodayActiveCount,
    int WeekActiveCount,
    int MonthActiveCount,
    decimal MonthRevenue,
    Guid? TopServiceId,
    int TopServiceCount,
    int? BusiestHour,
    int BusiestHourCount,
    int? QuietestHour,
    int QuietestHourCount);

public interface IAppointmentRepository
{
    Task<Appointment?> GetByIdAsync(Guid id);
    Task<List<Appointment>> GetByBusinessIdAsync(Guid businessId);
    Task<(List<Appointment> Items, int Total)> GetPaginatedByBusinessIdAsync(Guid businessId, int page, int pageSize);
    Task<List<Appointment>> GetByBusinessIdAndDateAsync(Guid businessId, DateTime date);
    Task<List<Appointment>> GetUpcomingForRemindersAsync(DateTime from, DateTime to);
    Task<List<Appointment>> GetByBusinessIdAndDateRangeAsync(Guid businessId, DateTime from, DateTime to);
    Task<List<Appointment>> GetPendingWhatsAppRemindersByBusinessAsync(Guid businessId, DateTime from, DateTime to);
    Task<DashboardAggregates> GetDashboardAggregatesAsync(
        Guid businessId, DateTime today, DateTime weekStart, DateTime weekEnd, DateTime monthStart, DateTime monthEnd);
    Task AddAsync(Appointment appointment);
    Task<bool> TryCreateWithOverlapCheckAsync(Appointment appointment);
    Task<bool> ClaimReminderAsync(Guid appointmentId);
    Task SaveChangesAsync();
}
