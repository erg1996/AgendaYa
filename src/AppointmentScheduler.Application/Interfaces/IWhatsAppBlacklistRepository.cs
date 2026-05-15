using AppointmentScheduler.Domain.Entities;

namespace AppointmentScheduler.Application.Interfaces;

public interface IWhatsAppBlacklistRepository
{
    Task<bool> IsBlockedAsync(Guid businessId, string normalizedPhone, CancellationToken ct = default);
    Task AddAsync(WhatsAppBlacklist entry, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}
