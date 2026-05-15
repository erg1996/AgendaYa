namespace AppointmentScheduler.Domain.Entities;

public class WhatsAppBlacklist
{
    public Guid Id { get; set; }
    public Guid BusinessId { get; set; }
    public string NormalizedPhone { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }

    public Business Business { get; set; } = null!;
}
