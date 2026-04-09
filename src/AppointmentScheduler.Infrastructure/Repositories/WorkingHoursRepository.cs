using AppointmentScheduler.Application.Interfaces;
using AppointmentScheduler.Domain.Entities;
using AppointmentScheduler.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AppointmentScheduler.Infrastructure.Repositories;

public class WorkingHoursRepository : IWorkingHoursRepository
{
    private readonly AppDbContext _context;

    public WorkingHoursRepository(AppDbContext context) => _context = context;

    public async Task<List<WorkingHours>> GetByBusinessIdAsync(Guid businessId) =>
        await _context.WorkingHours
            .Where(wh => wh.BusinessId == businessId)
            .OrderBy(wh => wh.DayOfWeek)
            .ToListAsync();

    public async Task<List<WorkingHours>> GetByBusinessIdAndDayAsync(Guid businessId, int dayOfWeek) =>
        await _context.WorkingHours
            .Where(wh => wh.BusinessId == businessId && wh.DayOfWeek == dayOfWeek)
            .ToListAsync();

    public async Task<WorkingHours?> GetByIdAsync(Guid id) =>
        await _context.WorkingHours.FindAsync(id);

    public async Task AddAsync(WorkingHours workingHours) =>
        await _context.WorkingHours.AddAsync(workingHours);

    public void Remove(WorkingHours workingHours) =>
        _context.WorkingHours.Remove(workingHours);

    public async Task SaveChangesAsync() =>
        await _context.SaveChangesAsync();
}
