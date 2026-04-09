using AppointmentScheduler.Domain.Entities;

namespace AppointmentScheduler.Application.Interfaces;

public interface IUserBusinessRepository
{
    Task<List<Business>> GetBusinessesByUserIdAsync(Guid userId);
    Task<bool> HasAccessAsync(Guid userId, Guid businessId);
    Task AddAsync(UserBusiness userBusiness);
    Task SaveChangesAsync();
}
