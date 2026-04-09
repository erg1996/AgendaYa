using AppointmentScheduler.Application.DTOs;
using AppointmentScheduler.Application.Exceptions;
using AppointmentScheduler.Application.Interfaces;
using AppointmentScheduler.Domain.Entities;

namespace AppointmentScheduler.Application.Services;

public class BlockedDateService
{
    private readonly IBlockedDateRepository _repository;
    private readonly IBusinessRepository _businessRepository;

    public BlockedDateService(IBlockedDateRepository repository, IBusinessRepository businessRepository)
    {
        _repository = repository;
        _businessRepository = businessRepository;
    }

    public async Task<List<BlockedDateResponse>> GetByBusinessIdAsync(Guid businessId)
    {
        var dates = await _repository.GetByBusinessIdAsync(businessId);
        return dates.Select(d => new BlockedDateResponse(d.Id, d.BusinessId, d.Date, d.Reason)).ToList();
    }

    public async Task<BlockedDateResponse> CreateAsync(CreateBlockedDateRequest request)
    {
        _ = await _businessRepository.GetByIdAsync(request.BusinessId)
            ?? throw new NotFoundException($"Business with id '{request.BusinessId}' not found.");

        var existing = await _repository.GetByBusinessIdAndDateAsync(request.BusinessId, request.Date);
        if (existing != null)
            throw new ConflictException($"Date {request.Date:yyyy-MM-dd} is already blocked.");

        var blocked = new BlockedDate
        {
            Id = Guid.NewGuid(),
            BusinessId = request.BusinessId,
            Date = request.Date.Date,
            Reason = request.Reason
        };

        await _repository.AddAsync(blocked);
        await _repository.SaveChangesAsync();

        return new BlockedDateResponse(blocked.Id, blocked.BusinessId, blocked.Date, blocked.Reason);
    }

    public async Task DeleteAsync(Guid id, Guid businessId)
    {
        var dates = await _repository.GetByBusinessIdAsync(businessId);
        var target = dates.FirstOrDefault(d => d.Id == id)
            ?? throw new NotFoundException($"Blocked date with id '{id}' not found.");

        await _repository.RemoveAsync(target);
        await _repository.SaveChangesAsync();
    }
}
