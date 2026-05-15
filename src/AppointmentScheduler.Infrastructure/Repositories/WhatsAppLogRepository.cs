using AppointmentScheduler.Application.Interfaces;
using AppointmentScheduler.Domain.Entities;
using AppointmentScheduler.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AppointmentScheduler.Infrastructure.Repositories;

public class WhatsAppLogRepository : IWhatsAppLogRepository
{
    private readonly AppDbContext _context;
    public WhatsAppLogRepository(AppDbContext context) => _context = context;

    public async Task AddAsync(WhatsAppLog log) =>
        await _context.WhatsAppLogs.AddAsync(log);

    public async Task<(List<WhatsAppLog> Items, int Total)> GetByBusinessIdAsync(
        Guid businessId, int page, int pageSize, WhatsAppMessageType? type = null)
    {
        var query = _context.WhatsAppLogs
            .Where(l => l.BusinessId == businessId);

        if (type.HasValue)
            query = query.Where(l => l.MessageType == type.Value);

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(l => l.SentAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (items, total);
    }

    public async Task<int> CountTodayByBusinessIdAsync(Guid businessId)
    {
        var todayStart = DateTime.UtcNow.AddHours(-6).Date; // El Salvador wall-clock midnight
        return await _context.WhatsAppLogs
            .Where(l => l.BusinessId == businessId && l.Success && l.SentAt >= todayStart)
            .CountAsync();
    }

    public async Task SaveChangesAsync() =>
        await _context.SaveChangesAsync();
}
