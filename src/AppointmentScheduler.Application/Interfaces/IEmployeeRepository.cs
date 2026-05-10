using AppointmentScheduler.Domain.Entities;

namespace AppointmentScheduler.Application.Interfaces;

public interface IEmployeeRepository
{
    Task<List<Employee>> GetByBusinessIdAsync(Guid businessId, bool includeInactive = false);
    Task<Employee?> GetByIdAsync(Guid id);
    Task<Employee?> GetByIdWithServicesAsync(Guid id);
    Task<List<Employee>> GetByBusinessIdWithServicesAsync(Guid businessId);
    Task AddAsync(Employee employee);
    Task SaveChangesAsync();
}
