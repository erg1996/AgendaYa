using AppointmentScheduler.Application.Interfaces;
using AppointmentScheduler.Domain.Entities;
using AppointmentScheduler.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AppointmentScheduler.Infrastructure.Repositories;

public class BusinessRepository : IBusinessRepository
{
    private readonly AppDbContext _context;

    public BusinessRepository(AppDbContext context) => _context = context;

    public async Task<Business?> GetByIdAsync(Guid id) =>
        await _context.Businesses.FindAsync(id);

    public async Task<Business?> GetBySlugAsync(string slug) =>
        await _context.Businesses.FirstOrDefaultAsync(b => b.Slug == slug);

    public async Task AddAsync(Business business) =>
        await _context.Businesses.AddAsync(business);

    public Task DeleteAsync(Business business)
    {
        _context.Businesses.Remove(business);
        return Task.CompletedTask;
    }

    public async Task SaveChangesAsync() =>
        await _context.SaveChangesAsync();
}
