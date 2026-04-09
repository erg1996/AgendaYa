namespace AppointmentScheduler.Domain.Entities;

public class WorkingHours
{
    public Guid Id { get; set; }
    public Guid BusinessId { get; set; }
    public int DayOfWeek { get; set; } // 0=Sunday, 1=Monday, ..., 6=Saturday
    public TimeSpan StartTime { get; set; }
    public TimeSpan EndTime { get; set; }

    public Business Business { get; set; } = null!;
}
