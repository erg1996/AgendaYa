using AppointmentScheduler.Application.Interfaces;
using AppointmentScheduler.Domain.Entities;
using AppointmentScheduler.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AppointmentScheduler.Infrastructure.Repositories;

public class WhatsAppBlacklistRepository : IWhatsAppBlacklistRepository
{
    private readonly AppDbContext _context;

    public WhatsAppBlacklistRepository(AppDbContext context) => _context = context;

    public Task<bool> IsBlockedAsync(Guid businessId, string normalizedPhone, CancellationToken ct = default) =>
        _context.WhatsAppBlacklists.AnyAsync(
            b => b.BusinessId == businessId && b.NormalizedPhone == normalizedPhone, ct);

    public async Task AddAsync(WhatsAppBlacklist entry, CancellationToken ct = default) =>
        await _context.WhatsAppBlacklists.AddAsync(entry, ct);

    public Task SaveChangesAsync(CancellationToken ct = default) =>
        _context.SaveChangesAsync(ct);
}
