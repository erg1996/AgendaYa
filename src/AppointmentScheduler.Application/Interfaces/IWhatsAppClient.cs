namespace AppointmentScheduler.Application.Interfaces;

public interface IWhatsAppClient
{
    Task<bool> PingAsync(CancellationToken ct = default);
}
