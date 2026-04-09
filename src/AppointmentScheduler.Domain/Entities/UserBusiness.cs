namespace AppointmentScheduler.Domain.Entities;

public class UserBusiness
{
    public Guid UserId { get; set; }
    public Guid BusinessId { get; set; }
    public DateTime CreatedAt { get; set; }

    public User User { get; set; } = null!;
    public Business Business { get; set; } = null!;
}
