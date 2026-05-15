using AppointmentScheduler.Application.DTOs;
using AppointmentScheduler.Application.Exceptions;
using AppointmentScheduler.Application.Interfaces;
using AppointmentScheduler.Domain.Entities;

namespace AppointmentScheduler.Application.Services;

public class AvailabilityService
{
    private readonly IWorkingHoursRepository _workingHoursRepository;
    private readonly IAppointmentRepository _appointmentRepository;
    private readonly IServiceRepository _serviceRepository;
    private readonly IBlockedDateRepository _blockedDateRepository;
    private readonly IEmployeeRepository _employeeRepository;

    public AvailabilityService(
        IWorkingHoursRepository workingHoursRepository,
        IAppointmentRepository appointmentRepository,
        IServiceRepository serviceRepository,
        IBlockedDateRepository blockedDateRepository,
        IEmployeeRepository employeeRepository)
    {
        _workingHoursRepository = workingHoursRepository;
        _appointmentRepository = appointmentRepository;
        _serviceRepository = serviceRepository;
        _blockedDateRepository = blockedDateRepository;
        _employeeRepository = employeeRepository;
    }

    // Returns available slots. If employeeId is provided, returns slots for
    // that employee only. Otherwise aggregates across all active employees who
    // offer the service — each slot carries the list of available employees so
    // the booking page can show "¿con quién?".
    public async Task<List<AvailableSlotResponse>> GetAvailableSlotsAsync(
        Guid businessId, DateTime date, Guid serviceId, Guid? employeeId = null)
    {
        var service = await _serviceRepository.GetByIdAsync(serviceId)
            ?? throw new NotFoundException($"Service with id '{serviceId}' not found.");

        var blocked = await _blockedDateRepository.GetByBusinessIdAndDateAsync(businessId, date);
        if (blocked != null)
            return [];

        int dayOfWeek = (int)date.DayOfWeek;

        // Determine which employees to consider.
        List<Employee> employees;
        if (employeeId.HasValue)
        {
            var emp = await _employeeRepository.GetByIdWithServicesAsync(employeeId.Value);
            if (emp is null || emp.BusinessId != businessId || !emp.IsActive)
                return [];
            employees = [emp];
        }
        else
        {
            employees = await _employeeRepository.GetByBusinessIdWithServicesAsync(businessId);
        }

        // Filter to employees who offer this service.
        employees = employees
            .Where(e => e.EmployeeServices.Any(es => es.ServiceId == serviceId))
            .ToList();

        if (employees.Count == 0)
            return [];

        // Generate slots per employee, then aggregate.
        // slotKey → list of available employees at that time.
        var slotMap = new SortedDictionary<DateTime, List<EmployeeSummary>>();

        foreach (var emp in employees)
        {
            var empLink = emp.EmployeeServices.First(es => es.ServiceId == serviceId);
            var duration = empLink.OverrideDurationMinutes ?? service.DurationMinutes;

            var workRanges = await _workingHoursRepository.GetByEmployeeIdAndDayAsync(emp.Id, dayOfWeek);
            if (workRanges.Count == 0) continue;

            var booked = await _appointmentRepository.GetByEmployeeIdAndDateAsync(emp.Id, date);

            foreach (var range in workRanges)
            {
                var slots = GenerateSlotsForRange(date.Date, range, duration, booked);
                foreach (var slot in slots)
                {
                    if (!slotMap.TryGetValue(slot, out var emps))
                    {
                        emps = [];
                        slotMap[slot] = emps;
                    }
                    emps.Add(new EmployeeSummary(emp.Id, emp.Name, emp.Color, emp.AvatarUrl, emp.Specialization));
                }
            }
        }

        // Build final response. Duration used in EndTime is from first available employee's link
        // (could vary per employee — use the employee's effective duration in the slot data).
        return slotMap.Select(kv =>
        {
            // Use shortest duration among available employees for the slot EndTime display.
            var minDuration = employees
                .Where(e => kv.Value.Any(s => s.Id == e.Id))
                .Min(e => e.EmployeeServices.FirstOrDefault(es => es.ServiceId == serviceId)?.OverrideDurationMinutes
                          ?? service.DurationMinutes);
            return new AvailableSlotResponse(kv.Key, kv.Key.AddMinutes(minDuration), kv.Value);
        }).ToList();
    }

    // Generates slot start times for a single working-hours range.
    private static List<DateTime> GenerateSlotsForRange(
        DateTime dateBase, WorkingHours range, int durationMinutes, List<Appointment> booked)
    {
        var slots = new List<DateTime>();
        var duration = TimeSpan.FromMinutes(durationMinutes);
        var slotStart = dateBase + range.StartTime;
        var rangeEnd = dateBase + range.EndTime;

        while (slotStart + duration <= rangeEnd)
        {
            var slotEnd = slotStart + duration;
            bool hasConflict = booked.Any(a =>
                slotStart < a.AppointmentDate.AddMinutes(a.DurationMinutes)
                && a.AppointmentDate < slotEnd);

            if (!hasConflict)
                slots.Add(slotStart);

            slotStart += duration;
        }
        return slots;
    }
}
