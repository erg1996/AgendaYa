namespace AppointmentScheduler.Domain.Entities;

public class Employee
{
    public Guid Id { get; set; }
    public Guid BusinessId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Color { get; set; } = "#6366f1";
    public string? AvatarUrl { get; set; }
    public string? Specialization { get; set; }
    public bool IsActive { get; set; } = true;
    public int DisplayOrder { get; set; }
    public decimal CommissionPercent { get; set; } = 100m;
    public Guid? UserId { get; set; }
    public DateTime CreatedAt { get; set; }

    public Business Business { get; set; } = null!;
    public List<WorkingHours> WorkingHours { get; set; } = new();
    public List<EmployeeServiceLink> EmployeeServices { get; set; } = new();
    public List<Appointment> Appointments { get; set; } = new();
}
