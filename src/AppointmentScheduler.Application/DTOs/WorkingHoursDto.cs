namespace AppointmentScheduler.Application.DTOs;

public record CreateWorkingHoursRequest(
    Guid EmployeeId,
    int DayOfWeek,
    TimeSpan StartTime,
    TimeSpan EndTime);

public record WorkingHoursResponse(
    Guid Id,
    Guid EmployeeId,
    int DayOfWeek,
    TimeSpan StartTime,
    TimeSpan EndTime);
