using AppointmentScheduler.Application.Interfaces;
using AppointmentScheduler.Domain.Entities;
using AppointmentScheduler.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AppointmentScheduler.Infrastructure.Repositories;

public class BlockedDateRepository : IBlockedDateRepository
{
    private readonly AppDbContext _context;

    public BlockedDateRepository(AppDbContext context) => _context = context;

    public async Task<List<BlockedDate>> GetByBusinessIdAsync(Guid businessId) =>
        await _context.BlockedDates
            .Where(bd => bd.BusinessId == businessId)
            .OrderBy(bd => bd.Date)
            .ToListAsync();

    public async Task<BlockedDate?> GetByBusinessIdAndDateAsync(Guid businessId, DateTime date) =>
        await _context.BlockedDates
            .FirstOrDefaultAsync(bd => bd.BusinessId == businessId && bd.Date.Date == date.Date);

    public async Task AddAsync(BlockedDate blockedDate) =>
        await _context.BlockedDates.AddAsync(blockedDate);

    public Task RemoveAsync(BlockedDate blockedDate)
    {
        _context.BlockedDates.Remove(blockedDate);
        return Task.CompletedTask;
    }

    public async Task SaveChangesAsync() =>
        await _context.SaveChangesAsync();
}
