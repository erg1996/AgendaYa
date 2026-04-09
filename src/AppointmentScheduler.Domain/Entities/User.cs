namespace AppointmentScheduler.Domain.Entities;

public class User
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public Guid BusinessId { get; set; }
    public DateTime CreatedAt { get; set; }

    public Business Business { get; set; } = null!;
    public List<UserBusiness> UserBusinesses { get; set; } = new();
}
