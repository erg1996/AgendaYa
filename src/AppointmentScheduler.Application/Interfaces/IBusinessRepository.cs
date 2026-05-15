using AppointmentScheduler.Domain.Entities;

namespace AppointmentScheduler.Application.Interfaces;

public interface IBusinessRepository
{
    Task<Business?> GetByIdAsync(Guid id);
    Task<Business?> GetBySlugAsync(string slug);
    Task<List<string>> GetOwnerEmailsAsync(Guid businessId);
    Task AddAsync(Business business);
    Task DeleteAsync(Business business);
    Task SaveChangesAsync();
}
