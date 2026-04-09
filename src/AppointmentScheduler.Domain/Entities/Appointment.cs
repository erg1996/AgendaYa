namespace AppointmentScheduler.Domain.Entities;

public enum AppointmentStatus
{
    Pending = 0,
    Confirmed = 1,
    Cancelled = 2,
    Completed = 3
}

public class Appointment
{
    public Guid Id { get; set; }
    public Guid BusinessId { get; set; }
    public Guid ServiceId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string? CustomerEmail { get; set; }
    public string? CustomerPhone { get; set; }
    public DateTime AppointmentDate { get; set; }
    public int DurationMinutes { get; set; }
    public AppointmentStatus Status { get; set; } = AppointmentStatus.Pending;
    public string? Notes { get; set; }
    public bool ReminderSent { get; set; }
    public DateTime CreatedAt { get; set; }

    public DateTime EndTime => AppointmentDate.AddMinutes(DurationMinutes);

    public Business Business { get; set; } = null!;
    public Service Service { get; set; } = null!;
}
