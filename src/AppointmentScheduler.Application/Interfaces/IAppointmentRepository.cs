using AppointmentScheduler.Domain.Entities;

namespace AppointmentScheduler.Application.Interfaces;

public interface IAppointmentRepository
{
    Task<Appointment?> GetByIdAsync(Guid id);
    Task<List<Appointment>> GetByBusinessIdAsync(Guid businessId);
    Task<(List<Appointment> Items, int Total)> GetPaginatedByBusinessIdAsync(Guid businessId, int page, int pageSize);
    Task<List<Appointment>> GetByBusinessIdAndDateAsync(Guid businessId, DateTime date);
    Task<List<Appointment>> GetUpcomingForRemindersAsync(DateTime from, DateTime to);
    Task<List<Appointment>> GetByBusinessIdAndDateRangeAsync(Guid businessId, DateTime from, DateTime to);
    Task AddAsync(Appointment appointment);
    Task SaveChangesAsync();
}
