namespace AppointmentScheduler.Application.DTOs;

public record CreateWorkingHoursRequest(
    Guid BusinessId,
    int DayOfWeek,
    TimeSpan StartTime,
    TimeSpan EndTime);

public record WorkingHoursResponse(
    Guid Id,
    Guid BusinessId,
    int DayOfWeek,
    TimeSpan StartTime,
    TimeSpan EndTime);
