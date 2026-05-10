namespace AppointmentScheduler.Domain.Entities;

// Join table: which services an employee offers, with optional price/duration overrides.
public class EmployeeServiceLink
{
    public Guid EmployeeId { get; set; }
    public Guid ServiceId { get; set; }
    public decimal? OverridePrice { get; set; }
    public int? OverrideDurationMinutes { get; set; }

    public Employee Employee { get; set; } = null!;
    public Service Service { get; set; } = null!;
}
