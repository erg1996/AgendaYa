namespace AppointmentScheduler.Domain.Entities;

public class WhatsAppLog
{
    public Guid Id { get; set; }
    public Guid BusinessId { get; set; }
    public Guid? AppointmentId { get; set; }
    public string? SenderPhone { get; set; }
    public string RecipientPhone { get; set; } = "";
    public string RecipientName { get; set; } = "";
    public WhatsAppMessageType MessageType { get; set; }
    public bool Success { get; set; }
    public string? ErrorReason { get; set; }
    public DateTime SentAt { get; set; }

    public Business Business { get; set; } = null!;
}

public enum WhatsAppMessageType
{
    Confirmation  = 0,
    AutoReminder  = 1,
    ManualReminder = 2,
    Campaign      = 3
}
