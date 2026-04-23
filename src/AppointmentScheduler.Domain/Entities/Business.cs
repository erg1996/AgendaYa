namespace AppointmentScheduler.Domain.Entities;

public class Business
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? LogoUrl { get; set; }
    public string? BrandColor { get; set; }
    public string? WhatsAppReminderTemplate { get; set; }
    public string? Address { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public DateTime CreatedAt { get; set; }

    public List<Service> Services { get; set; } = new();
    public List<Appointment> Appointments { get; set; } = new();
    public List<WorkingHours> WorkingHours { get; set; } = new();
    public List<BlockedDate> BlockedDates { get; set; } = new();
    public List<UserBusiness> UserBusinesses { get; set; } = new();
}
