using AppointmentScheduler.Domain.Entities;

namespace AppointmentScheduler.Application.Interfaces;

public interface IWhatsAppLogRepository
{
    Task AddAsync(WhatsAppLog log);
    Task<(List<WhatsAppLog> Items, int Total)> GetByBusinessIdAsync(Guid businessId, int page, int pageSize, WhatsAppMessageType? type = null);
    Task<int> CountTodayByBusinessIdAsync(Guid businessId);
    Task SaveChangesAsync();
}
