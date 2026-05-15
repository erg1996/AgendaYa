using AppointmentScheduler.Application.Interfaces;
using AppointmentScheduler.Domain.Entities;
using AppointmentScheduler.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AppointmentScheduler.Infrastructure.Repositories;

public class WhatsAppSessionRepository : IWhatsAppSessionRepository
{
    private readonly AppDbContext _context;

    public WhatsAppSessionRepository(AppDbContext context) => _context = context;

    public Task<WhatsAppSession?> GetByBusinessIdAsync(Guid businessId, CancellationToken ct = default) =>
        _context.WhatsAppSessions.FirstOrDefaultAsync(s => s.BusinessId == businessId, ct);

    public async Task AddAsync(WhatsAppSession session, CancellationToken ct = default) =>
        await _context.WhatsAppSessions.AddAsync(session, ct);

    public Task DeleteAsync(WhatsAppSession session, CancellationToken ct = default)
    {
        _context.WhatsAppSessions.Remove(session);
        return Task.CompletedTask;
    }

    public Task SaveChangesAsync(CancellationToken ct = default) =>
        _context.SaveChangesAsync(ct);
}
