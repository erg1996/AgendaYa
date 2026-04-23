using AppointmentScheduler.Application.Interfaces;
using AppointmentScheduler.Domain.Entities;
using AppointmentScheduler.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AppointmentScheduler.Infrastructure.Repositories;

public class ServiceRepository : IServiceRepository
{
    private readonly AppDbContext _context;

    public ServiceRepository(AppDbContext context) => _context = context;

    public async Task<Service?> GetByIdAsync(Guid id) =>
        await _context.Services.FindAsync(id);

    public async Task<List<Service>> GetByBusinessIdAsync(Guid businessId) =>
        await _context.Services.Where(s => s.BusinessId == businessId).ToListAsync();

    public async Task<int> CountByBusinessIdAsync(Guid businessId) =>
        await _context.Services.CountAsync(s => s.BusinessId == businessId);

    public async Task AddAsync(Service service) =>
        await _context.Services.AddAsync(service);

    public void Remove(Service service) =>
        _context.Services.Remove(service);

    public async Task SaveChangesAsync() =>
        await _context.SaveChangesAsync();
}
