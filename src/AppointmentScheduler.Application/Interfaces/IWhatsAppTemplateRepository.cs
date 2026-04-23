using AppointmentScheduler.Domain.Entities;

namespace AppointmentScheduler.Application.Interfaces;

public interface IWhatsAppTemplateRepository
{
    Task<List<WhatsAppMessageTemplate>> GetByBusinessIdAsync(Guid businessId);
    Task<WhatsAppMessageTemplate?> GetByIdAsync(Guid id);
    Task AddAsync(WhatsAppMessageTemplate template);
    Task DeleteAsync(WhatsAppMessageTemplate template);
    Task SaveChangesAsync();
}
