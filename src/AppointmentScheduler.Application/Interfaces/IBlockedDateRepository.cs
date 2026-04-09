using AppointmentScheduler.Domain.Entities;

namespace AppointmentScheduler.Application.Interfaces;

public interface IBlockedDateRepository
{
    Task<List<BlockedDate>> GetByBusinessIdAsync(Guid businessId);
    Task<BlockedDate?> GetByBusinessIdAndDateAsync(Guid businessId, DateTime date);
    Task AddAsync(BlockedDate blockedDate);
    Task RemoveAsync(BlockedDate blockedDate);
    Task SaveChangesAsync();
}
