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

    public AvailabilityService(
        IWorkingHoursRepository workingHoursRepository,
        IAppointmentRepository appointmentRepository,
        IServiceRepository serviceRepository,
        IBlockedDateRepository blockedDateRepository)
    {
        _workingHoursRepository = workingHoursRepository;
        _appointmentRepository = appointmentRepository;
        _serviceRepository = serviceRepository;
        _blockedDateRepository = blockedDateRepository;
    }

    public async Task<List<AvailableSlotResponse>> GetAvailableSlotsAsync(Guid businessId, DateTime date, Guid serviceId)
    {
        var service = await _serviceRepository.GetByIdAsync(serviceId)
            ?? throw new NotFoundException($"Service with id '{serviceId}' not found.");

        // Check if the date is blocked
        var blocked = await _blockedDateRepository.GetByBusinessIdAndDateAsync(businessId, date);
        if (blocked != null)
            return new List<AvailableSlotResponse>();

        int dayOfWeek = (int)date.DayOfWeek;
        var workingHoursList = await _workingHoursRepository.GetByBusinessIdAndDayAsync(businessId, dayOfWeek);

        if (workingHoursList.Count == 0)
            return new List<AvailableSlotResponse>();

        var existingAppointments = await _appointmentRepository.GetByBusinessIdAndDateAsync(businessId, date);

        return GenerateAvailableSlots(
            date.Date,
            workingHoursList[0],
            service.DurationMinutes,
            existingAppointments);
    }

    /// <summary>
    /// Pure function that generates available slots. Extracted for testability.
    /// </summary>
    public static List<AvailableSlotResponse> GenerateAvailableSlots(
        DateTime dateBase,
        WorkingHours workingHours,
        int durationMinutes,
        List<Appointment> existingAppointments)
    {
        var slots = new List<AvailableSlotResponse>();
        var duration = TimeSpan.FromMinutes(durationMinutes);

        var slotStart = dateBase + workingHours.StartTime;
        var dayEnd = dateBase + workingHours.EndTime;

        while (slotStart + duration <= dayEnd)
        {
            var slotEnd = slotStart + duration;

            // Check overlap: two ranges [A_start, A_end) and [B_start, B_end) overlap
            // if A_start < B_end AND B_start < A_end
            bool hasConflict = existingAppointments.Any(a =>
                slotStart < a.EndTime && a.AppointmentDate < slotEnd);

            if (!hasConflict)
            {
                slots.Add(new AvailableSlotResponse(slotStart, slotEnd));
            }

            slotStart += duration;
        }

        return slots;
    }
}
