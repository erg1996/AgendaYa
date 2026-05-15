using AppointmentScheduler.Domain.Entities;

namespace AppointmentScheduler.Application.Interfaces;

public interface IWhatsAppSessionRepository
{
    Task<WhatsAppSession?> GetByBusinessIdAsync(Guid businessId, CancellationToken ct = default);
    Task AddAsync(WhatsAppSession session, CancellationToken ct = default);
    Task DeleteAsync(WhatsAppSession session, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}
