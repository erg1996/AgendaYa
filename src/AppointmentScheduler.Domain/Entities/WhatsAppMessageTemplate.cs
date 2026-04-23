namespace AppointmentScheduler.Domain.Entities;

public class WhatsAppMessageTemplate
{
    public Guid Id { get; set; }
    public Guid BusinessId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public Business Business { get; set; } = null!;
}
