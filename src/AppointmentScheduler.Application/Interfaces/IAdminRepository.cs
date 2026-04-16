using AppointmentScheduler.Application.DTOs;

namespace AppointmentScheduler.Application.Interfaces;

public interface IAdminRepository
{
    Task<AdminOverviewDto> GetOverviewAsync(DateTime now);
    Task<List<AdminBusinessRowDto>> GetBusinessesAsync(DateTime now);
    Task<AdminBusinessDetailDto?> GetBusinessDetailAsync(Guid businessId, DateTime now);
    Task<List<AdminActivityItemDto>> GetRecentActivityAsync(int limit);
}
