using AppointmentScheduler.Application.Interfaces;
using AppointmentScheduler.Domain.Entities;
using AppointmentScheduler.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AppointmentScheduler.Infrastructure.Repositories;

public class EmployeeRepository : IEmployeeRepository
{
    private readonly AppDbContext _context;

    public EmployeeRepository(AppDbContext context) => _context = context;

    public async Task<List<Employee>> GetByBusinessIdAsync(Guid businessId, bool includeInactive = false) =>
        await _context.Employees
            .Where(e => e.BusinessId == businessId && (includeInactive || e.IsActive))
            .OrderBy(e => e.DisplayOrder)
            .ThenBy(e => e.Name)
            .ToListAsync();

    public async Task<Employee?> GetByIdAsync(Guid id) =>
        await _context.Employees.FindAsync(id);

    public async Task<Employee?> GetByIdWithServicesAsync(Guid id) =>
        await _context.Employees
            .Include(e => e.EmployeeServices)
                .ThenInclude(es => es.Service)
            .FirstOrDefaultAsync(e => e.Id == id);

    public async Task<List<Employee>> GetByBusinessIdWithServicesAsync(Guid businessId) =>
        await _context.Employees
            .Include(e => e.EmployeeServices)
                .ThenInclude(es => es.Service)
            .Where(e => e.BusinessId == businessId && e.IsActive)
            .OrderBy(e => e.DisplayOrder)
            .ThenBy(e => e.Name)
            .ToListAsync();

    public async Task AddAsync(Employee employee) =>
        await _context.Employees.AddAsync(employee);

    public async Task SaveChangesAsync() =>
        await _context.SaveChangesAsync();
}
