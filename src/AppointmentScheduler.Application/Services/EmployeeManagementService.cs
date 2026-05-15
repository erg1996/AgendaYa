using AppointmentScheduler.Application.DTOs;
using AppointmentScheduler.Application.Exceptions;
using AppointmentScheduler.Application.Interfaces;
using AppointmentScheduler.Domain.Entities;

namespace AppointmentScheduler.Application.Services;

public class EmployeeManagementService
{
    private readonly IEmployeeRepository _employees;
    private readonly IBusinessRepository _businesses;
    private readonly IServiceRepository _services;
    private readonly IWorkingHoursRepository _workingHours;

    public EmployeeManagementService(
        IEmployeeRepository employees,
        IBusinessRepository businesses,
        IServiceRepository services,
        IWorkingHoursRepository workingHours)
    {
        _employees = employees;
        _businesses = businesses;
        _services = services;
        _workingHours = workingHours;
    }

    public async Task<List<EmployeeResponse>> GetByBusinessAsync(Guid businessId, bool includeInactive = false)
    {
        var employees = await _employees.GetByBusinessIdWithServicesAsync(businessId);
        if (includeInactive)
            employees = (await _employees.GetByBusinessIdAsync(businessId, includeInactive: true))
                .Concat(employees).DistinctBy(e => e.Id).ToList();

        var allSvcs = await _services.GetByBusinessIdAsync(businessId);
        var svcMap = allSvcs.ToDictionary(s => s.Id);

        return employees.Select(e => ToResponse(e, svcMap)).ToList();
    }

    public async Task<EmployeeResponse> GetByIdAsync(Guid id)
    {
        var emp = await _employees.GetByIdWithServicesAsync(id)
            ?? throw new NotFoundException($"Employee '{id}' not found.");

        var allSvcs = await _services.GetByBusinessIdAsync(emp.BusinessId);
        return ToResponse(emp, allSvcs.ToDictionary(s => s.Id));
    }

    public async Task<EmployeeResponse> CreateAsync(CreateEmployeeRequest request)
    {
        _ = await _businesses.GetByIdAsync(request.BusinessId)
            ?? throw new NotFoundException($"Business '{request.BusinessId}' not found.");

        var existing = await _employees.GetByBusinessIdAsync(request.BusinessId, includeInactive: true);
        var emp = new Employee
        {
            Id = Guid.NewGuid(),
            BusinessId = request.BusinessId,
            Name = request.Name.Trim(),
            Color = string.IsNullOrWhiteSpace(request.Color) ? "#6366f1" : request.Color,
            CommissionPercent = request.CommissionPercent,
            IsActive = true,
            DisplayOrder = existing.Count,
            CreatedAt = DateTime.UtcNow,
        };

        await _employees.AddAsync(emp);
        await _employees.SaveChangesAsync();

        return ToResponse(emp, new());
    }

    public async Task<EmployeeResponse> UpdateAsync(Guid id, Guid businessId, UpdateEmployeeRequest request)
    {
        var emp = await _employees.GetByIdWithServicesAsync(id)
            ?? throw new NotFoundException($"Employee '{id}' not found.");

        if (emp.BusinessId != businessId)
            throw new ForbiddenException("Employee does not belong to this business.");

        emp.Name = request.Name.Trim();
        emp.Color = string.IsNullOrWhiteSpace(request.Color) ? emp.Color : request.Color;
        emp.IsActive = request.IsActive;
        emp.DisplayOrder = request.DisplayOrder;
        emp.CommissionPercent = request.CommissionPercent;
        emp.Specialization = string.IsNullOrWhiteSpace(request.Specialization) ? null : request.Specialization.Trim();
        if (request.AvatarUrl != null)
            emp.AvatarUrl = string.IsNullOrWhiteSpace(request.AvatarUrl) ? null : request.AvatarUrl.Trim();

        // Replace service links
        emp.EmployeeServices.Clear();
        foreach (var svcReq in request.Services)
        {
            emp.EmployeeServices.Add(new EmployeeServiceLink
            {
                EmployeeId = emp.Id,
                ServiceId = svcReq.ServiceId,
                OverridePrice = svcReq.OverridePrice,
                OverrideDurationMinutes = svcReq.OverrideDurationMinutes,
            });
        }

        await _employees.SaveChangesAsync();

        var allSvcs = await _services.GetByBusinessIdAsync(emp.BusinessId);
        return ToResponse(emp, allSvcs.ToDictionary(s => s.Id));
    }

    public async Task<List<WorkingHoursResponse>> GetWorkingHoursAsync(Guid employeeId, Guid businessId)
    {
        var emp = await _employees.GetByIdAsync(employeeId)
            ?? throw new NotFoundException($"Employee '{employeeId}' not found.");
        if (emp.BusinessId != businessId)
            throw new ForbiddenException("Employee does not belong to this business.");

        var hours = await _workingHours.GetByEmployeeIdAsync(employeeId);
        return hours.Select(ToWHResponse).ToList();
    }

    public async Task<WorkingHoursResponse> AddWorkingHoursAsync(Guid employeeId, Guid businessId, CreateWorkingHoursRequest request)
    {
        var emp = await _employees.GetByIdAsync(employeeId)
            ?? throw new NotFoundException($"Employee '{employeeId}' not found.");
        if (emp.BusinessId != businessId)
            throw new ForbiddenException("Employee does not belong to this business.");

        if (request.DayOfWeek < 0 || request.DayOfWeek > 6)
            throw new ConflictException("DayOfWeek must be 0–6.");
        if (request.StartTime >= request.EndTime)
            throw new ConflictException("StartTime must be before EndTime.");

        var wh = new WorkingHours
        {
            Id = Guid.NewGuid(),
            EmployeeId = employeeId,
            DayOfWeek = request.DayOfWeek,
            StartTime = request.StartTime,
            EndTime = request.EndTime,
        };

        await _workingHours.AddAsync(wh);
        await _workingHours.SaveChangesAsync();
        return ToWHResponse(wh);
    }

    public async Task<WorkingHoursResponse> UpdateWorkingHoursAsync(Guid whId, Guid businessId, CreateWorkingHoursRequest request)
    {
        var wh = await _workingHours.GetByIdAsync(whId)
            ?? throw new NotFoundException($"WorkingHours '{whId}' not found.");

        var emp = await _employees.GetByIdAsync(wh.EmployeeId)
            ?? throw new NotFoundException("Employee not found.");
        if (emp.BusinessId != businessId)
            throw new ForbiddenException("Employee does not belong to this business.");

        if (request.StartTime >= request.EndTime)
            throw new ConflictException("StartTime must be before EndTime.");

        wh.StartTime = request.StartTime;
        wh.EndTime = request.EndTime;

        await _workingHours.SaveChangesAsync();
        return ToWHResponse(wh);
    }

    public async Task DeleteWorkingHoursAsync(Guid whId, Guid businessId)
    {
        var wh = await _workingHours.GetByIdAsync(whId)
            ?? throw new NotFoundException($"WorkingHours '{whId}' not found.");

        var emp = await _employees.GetByIdAsync(wh.EmployeeId)
            ?? throw new NotFoundException("Employee not found.");
        if (emp.BusinessId != businessId)
            throw new ForbiddenException("Employee does not belong to this business.");

        _workingHours.Remove(wh);
        await _workingHours.SaveChangesAsync();
    }

    private static EmployeeResponse ToResponse(Employee e, Dictionary<Guid, Domain.Entities.Service> svcMap) =>
        new(e.Id, e.BusinessId, e.Name, e.Color, e.AvatarUrl, e.Specialization, e.IsActive, e.DisplayOrder, e.CommissionPercent,
            e.EmployeeServices.Select(es =>
            {
                svcMap.TryGetValue(es.ServiceId, out var svc);
                return new EmployeeServiceResponse(
                    es.ServiceId,
                    svc?.Name ?? "Servicio",
                    es.OverridePrice ?? svc?.Price,
                    es.OverrideDurationMinutes ?? svc?.DurationMinutes ?? 0,
                    es.OverridePrice,
                    es.OverrideDurationMinutes);
            }).ToList());

    private static WorkingHoursResponse ToWHResponse(WorkingHours wh) =>
        new(wh.Id, wh.EmployeeId, wh.DayOfWeek, wh.StartTime, wh.EndTime);
}
