using AppointmentScheduler.Application.DTOs;
using AppointmentScheduler.Application.Interfaces;

namespace AppointmentScheduler.Application.Services;

public class AdminService
{
    private readonly IAdminRepository _repo;

    public AdminService(IAdminRepository repo) => _repo = repo;

    public Task<AdminOverviewDto> GetOverviewAsync() =>
        _repo.GetOverviewAsync(DateTime.UtcNow);

    public Task<List<AdminBusinessRowDto>> GetBusinessesAsync() =>
        _repo.GetBusinessesAsync(DateTime.UtcNow);

    public Task<AdminBusinessDetailDto?> GetBusinessDetailAsync(Guid businessId) =>
        _repo.GetBusinessDetailAsync(businessId, DateTime.UtcNow);

    public Task<List<AdminActivityItemDto>> GetRecentActivityAsync(int limit = 50) =>
        _repo.GetRecentActivityAsync(Math.Clamp(limit, 1, 200));
}
