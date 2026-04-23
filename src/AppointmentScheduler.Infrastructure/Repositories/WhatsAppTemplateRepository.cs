using AppointmentScheduler.Application.Interfaces;
using AppointmentScheduler.Domain.Entities;
using AppointmentScheduler.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AppointmentScheduler.Infrastructure.Repositories;

public class WhatsAppTemplateRepository : IWhatsAppTemplateRepository
{
    private readonly AppDbContext _context;

    public WhatsAppTemplateRepository(AppDbContext context) => _context = context;

    public async Task<List<WhatsAppMessageTemplate>> GetByBusinessIdAsync(Guid businessId) =>
        await _context.WhatsAppMessageTemplates
            .Where(t => t.BusinessId == businessId)
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync();

    public async Task<WhatsAppMessageTemplate?> GetByIdAsync(Guid id) =>
        await _context.WhatsAppMessageTemplates.FindAsync(id);

    public async Task AddAsync(WhatsAppMessageTemplate template) =>
        await _context.WhatsAppMessageTemplates.AddAsync(template);

    public Task DeleteAsync(WhatsAppMessageTemplate template)
    {
        _context.WhatsAppMessageTemplates.Remove(template);
        return Task.CompletedTask;
    }

    public async Task SaveChangesAsync() =>
        await _context.SaveChangesAsync();
}
