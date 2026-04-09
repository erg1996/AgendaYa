using AppointmentScheduler.Domain.Entities;

namespace AppointmentScheduler.Application.Interfaces;

public interface IWorkingHoursRepository
{
    Task<List<WorkingHours>> GetByBusinessIdAsync(Guid businessId);
    Task<List<WorkingHours>> GetByBusinessIdAndDayAsync(Guid businessId, int dayOfWeek);
    Task<WorkingHours?> GetByIdAsync(Guid id);
    Task AddAsync(WorkingHours workingHours);
    void Remove(WorkingHours workingHours);
    Task SaveChangesAsync();
}
