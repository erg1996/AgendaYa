namespace AppointmentScheduler.Application.DTOs;

public record GdprUserDto(Guid Id, string Email, string FullName, DateTime CreatedAt);
public record GdprBusinessDto(Guid Id, string Name, string Slug, DateTime CreatedAt);
public record GdprAppointmentDto(Guid Id, string CustomerName, string? CustomerEmail, string? CustomerPhone, DateTime AppointmentDate, int DurationMinutes, string Status, string? Notes, DateTime CreatedAt, string ServiceName);
public record GdprExportDto(GdprUserDto User, GdprBusinessDto Business, List<GdprAppointmentDto> Appointments);
public record DeleteAccountRequest(string Password);
