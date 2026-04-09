using System.Text;
using AppointmentScheduler.API.Extensions;
using AppointmentScheduler.Application.Interfaces;
using AppointmentScheduler.Application.Services;
using AppointmentScheduler.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AppointmentScheduler.API.Controllers;

[ApiController]
[Route("api/reports")]
[Authorize]
public class ReportsController : ControllerBase
{
    private readonly IAppointmentRepository _appointmentRepo;
    private readonly IServiceRepository _serviceRepo;
    private readonly IBusinessRepository _businessRepo;
    private readonly BusinessService _businessService;

    public ReportsController(
        IAppointmentRepository appointmentRepo,
        IServiceRepository serviceRepo,
        IBusinessRepository businessRepo,
        BusinessService businessService)
    {
        _appointmentRepo = appointmentRepo;
        _serviceRepo = serviceRepo;
        _businessRepo = businessRepo;
        _businessService = businessService;
    }

    /// <summary>
    /// GET /api/reports/appointments.csv?businessId=...&from=YYYY-MM-DD&to=YYYY-MM-DD
    /// Downloads a CSV with all appointments in the given date range (defaults to current month).
    /// </summary>
    [HttpGet("appointments.csv")]
    public async Task<IActionResult> ExportCsv(
        [FromQuery] Guid businessId,
        [FromQuery] string? from = null,
        [FromQuery] string? to = null)
    {
        var userId = User.GetUserId();
        await _businessService.ValidateOwnershipAsync(userId, businessId);

        var business = await _businessRepo.GetByIdAsync(businessId);
        var now = DateTime.UtcNow;

        var fromDate = from != null ? DateTime.Parse(from).ToUniversalTime() : new DateTime(now.Year, now.Month, 1);
        var toDate = to != null ? DateTime.Parse(to).ToUniversalTime().AddDays(1) : fromDate.AddMonths(1);

        var appointments = await _appointmentRepo.GetByBusinessIdAndDateRangeAsync(businessId, fromDate, toDate);
        var services = await _serviceRepo.GetByBusinessIdAsync(businessId);
        var serviceMap = services.ToDictionary(s => s.Id);

        var csv = new StringBuilder();
        csv.AppendLine("Fecha,Hora,Cliente,Email,Telefono,Servicio,Duracion (min),Precio,Estado,Notas");

        foreach (var a in appointments.OrderBy(a => a.AppointmentDate))
        {
            var svc = serviceMap.TryGetValue(a.ServiceId, out var s) ? s : null;
            var price = svc?.Price.HasValue == true ? svc.Price.Value.ToString("F2") : "";
            var statusLabel = a.Status switch
            {
                AppointmentStatus.Pending => "Pendiente",
                AppointmentStatus.Confirmed => "Confirmada",
                AppointmentStatus.Completed => "Completada",
                AppointmentStatus.Cancelled => "Cancelada",
                _ => a.Status.ToString()
            };

            csv.AppendLine(string.Join(",", new[]
            {
                a.AppointmentDate.ToString("yyyy-MM-dd"),
                a.AppointmentDate.ToString("HH:mm"),
                EscapeCsv(a.CustomerName),
                EscapeCsv(a.CustomerEmail ?? ""),
                EscapeCsv(a.CustomerPhone ?? ""),
                EscapeCsv(svc?.Name ?? ""),
                a.DurationMinutes.ToString(),
                price,
                statusLabel,
                EscapeCsv(a.Notes ?? "")
            }));
        }

        var businessName = business?.Name ?? "reporte";
        var fileName = $"{Slugify(businessName)}_{fromDate:yyyy-MM}_{toDate:yyyy-MM}.csv";
        var bytes = Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(csv.ToString())).ToArray();

        return File(bytes, "text/csv; charset=utf-8", fileName);
    }

    private static string EscapeCsv(string value)
    {
        if (value.Contains(',') || value.Contains('"') || value.Contains('\n'))
            return $"\"{value.Replace("\"", "\"\"")}\"";
        return value;
    }

    private static string Slugify(string name) =>
        new string(name.ToLower()
            .Replace(' ', '-')
            .Where(c => char.IsLetterOrDigit(c) || c == '-')
            .ToArray());
}
