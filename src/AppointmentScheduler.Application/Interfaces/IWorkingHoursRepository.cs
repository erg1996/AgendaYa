using AppointmentScheduler.Domain.Entities;

namespace AppointmentScheduler.Application.Interfaces;

public interface IWorkingHoursRepository
{
    Task<List<WorkingHours>> GetByEmployeeIdAsync(Guid employeeId);
    Task<List<WorkingHours>> GetByEmployeeIdAndDayAsync(Guid employeeId, int dayOfWeek);
    Task<WorkingHours?> GetByIdAsync(Guid id);
    Task AddAsync(WorkingHours workingHours);
    void Remove(WorkingHours workingHours);
    Task SaveChangesAsync();
}
