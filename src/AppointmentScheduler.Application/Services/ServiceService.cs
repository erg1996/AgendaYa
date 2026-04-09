using AppointmentScheduler.Application.DTOs;
using AppointmentScheduler.Application.Exceptions;
using AppointmentScheduler.Application.Interfaces;
using AppointmentScheduler.Domain.Entities;

namespace AppointmentScheduler.Application.Services;

public class ServiceService
{
    private readonly IServiceRepository _serviceRepository;
    private readonly IBusinessRepository _businessRepository;

    public ServiceService(IServiceRepository serviceRepository, IBusinessRepository businessRepository)
    {
        _serviceRepository = serviceRepository;
        _businessRepository = businessRepository;
    }

    public async Task<ServiceResponse> CreateAsync(CreateServiceRequest request)
    {
        _ = await _businessRepository.GetByIdAsync(request.BusinessId)
            ?? throw new NotFoundException($"Business with id '{request.BusinessId}' not found.");

        var service = new Service
        {
            Id = Guid.NewGuid(),
            BusinessId = request.BusinessId,
            Name = request.Name.Trim(),
            DurationMinutes = request.DurationMinutes,
            Price = request.Price
        };

        await _serviceRepository.AddAsync(service);
        await _serviceRepository.SaveChangesAsync();

        return new ServiceResponse(service.Id, service.BusinessId, service.Name, service.DurationMinutes, service.Price);
    }

    public async Task<List<ServiceResponse>> GetByBusinessIdAsync(Guid businessId)
    {
        var services = await _serviceRepository.GetByBusinessIdAsync(businessId);
        return services.Select(s => new ServiceResponse(s.Id, s.BusinessId, s.Name, s.DurationMinutes, s.Price)).ToList();
    }

    public async Task DeleteAsync(Guid id, Guid businessId)
    {
        var service = await _serviceRepository.GetByIdAsync(id)
            ?? throw new NotFoundException($"Service with id '{id}' not found.");

        if (service.BusinessId != businessId)
            throw new ForbiddenException("Service does not belong to this business.");

        // Soft delete instead of hard delete
        service.IsDeleted = true;
        await _serviceRepository.SaveChangesAsync();
    }
}
