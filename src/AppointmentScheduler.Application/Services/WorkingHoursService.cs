using AppointmentScheduler.Application.DTOs;
using AppointmentScheduler.Application.Exceptions;
using AppointmentScheduler.Application.Interfaces;
using AppointmentScheduler.Domain.Entities;

namespace AppointmentScheduler.Application.Services;

// Legacy controller still routes through here. Delegates to EmployeeManagementService
// for the actual logic; this class kept only so WorkingHoursController compiles.
public class WorkingHoursService
{
    private readonly IWorkingHoursRepository _workingHoursRepository;

    public WorkingHoursService(IWorkingHoursRepository workingHoursRepository)
    {
        _workingHoursRepository = workingHoursRepository;
    }

    public async Task<List<WorkingHoursResponse>> GetByEmployeeIdAsync(Guid employeeId)
    {
        var hours = await _workingHoursRepository.GetByEmployeeIdAsync(employeeId);
        return hours.Select(ToResponse).ToList();
    }

    public async Task<WorkingHoursResponse> CreateAsync(CreateWorkingHoursRequest request)
    {
        if (request.DayOfWeek < 0 || request.DayOfWeek > 6)
            throw new ConflictException("DayOfWeek must be between 0 (Sunday) and 6 (Saturday).");

        if (request.StartTime >= request.EndTime)
            throw new ConflictException("StartTime must be before EndTime.");

        var workingHours = new WorkingHours
        {
            Id = Guid.NewGuid(),
            EmployeeId = request.EmployeeId,
            DayOfWeek = request.DayOfWeek,
            StartTime = request.StartTime,
            EndTime = request.EndTime,
        };

        await _workingHoursRepository.AddAsync(workingHours);
        await _workingHoursRepository.SaveChangesAsync();

        return ToResponse(workingHours);
    }

    public async Task<WorkingHoursResponse> UpdateAsync(Guid id, CreateWorkingHoursRequest request)
    {
        var wh = await _workingHoursRepository.GetByIdAsync(id)
            ?? throw new NotFoundException($"Working hours with id '{id}' not found.");

        if (request.StartTime >= request.EndTime)
            throw new ConflictException("StartTime must be before EndTime.");

        wh.StartTime = request.StartTime;
        wh.EndTime = request.EndTime;

        await _workingHoursRepository.SaveChangesAsync();
        return ToResponse(wh);
    }

    public async Task DeleteAsync(Guid id)
    {
        var wh = await _workingHoursRepository.GetByIdAsync(id)
            ?? throw new NotFoundException($"Working hours with id '{id}' not found.");

        _workingHoursRepository.Remove(wh);
        await _workingHoursRepository.SaveChangesAsync();
    }

    private static WorkingHoursResponse ToResponse(WorkingHours wh) =>
        new(wh.Id, wh.EmployeeId, wh.DayOfWeek, wh.StartTime, wh.EndTime);
}
