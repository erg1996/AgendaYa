using System.ComponentModel.DataAnnotations;

namespace AppointmentScheduler.Application.DTOs;

public record CreateAppointmentRequest(
    [Required] Guid BusinessId,
    [Required] Guid ServiceId,
    [Required, MaxLength(200)] string CustomerName,
    [EmailAddress, MaxLength(200)] string? CustomerEmail,
    [MaxLength(30)] string? CustomerPhone,
    [Required] DateTime AppointmentDate);

public record AppointmentResponse(
    Guid Id,
    Guid BusinessId,
    Guid ServiceId,
    string CustomerName,
    string? CustomerEmail,
    string? CustomerPhone,
    DateTime AppointmentDate,
    int DurationMinutes,
    DateTime EndTime,
    string Status,
    string? Notes,
    DateTime CreatedAt);

public record UpdateAppointmentStatusRequest(
    [Required, RegularExpression("^(Confirmed|Cancelled|Completed)$")] string Status);

public record UpdateAppointmentNotesRequest(
    [MaxLength(1000)] string? Notes);

// Pagination
public record PaginatedResponse<T>(List<T> Items, int Total, int Page, int PageSize);
