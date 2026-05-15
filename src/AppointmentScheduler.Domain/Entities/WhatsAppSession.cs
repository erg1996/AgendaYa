namespace AppointmentScheduler.Domain.Entities;

public class WhatsAppSession
{
    public Guid Id { get; set; }
    public Guid BusinessId { get; set; }
    public WhatsAppSessionStatus Status { get; set; }
    public string? PhoneNumber { get; set; }
    public DateTime? LastConnectedAt { get; set; }
    public DateTime? LastQrGeneratedAt { get; set; }
    public string? LastError { get; set; }
    public bool AutoRemindersEnabled { get; set; }
    public DateTime? FirstConnectedAt { get; set; }
    public string? TimeZoneId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public Business Business { get; set; } = null!;
}

public enum WhatsAppSessionStatus
{
    Disconnected = 0,
    Starting = 1,
    WaitingQr = 2,
    Connected = 3,
    Failed = 4
}
