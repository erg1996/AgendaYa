namespace AppointmentScheduler.Domain.Entities;

public class BlockedDate
{
    public Guid Id { get; set; }
    public Guid BusinessId { get; set; }
    public DateTime Date { get; set; }
    public string Reason { get; set; } = string.Empty;

    public Business Business { get; set; } = null!;
}
