using System.ComponentModel.DataAnnotations;

namespace AppointmentScheduler.Application.DTOs;

public record EmployeeResponse(
    Guid Id,
    Guid BusinessId,
    string Name,
    string Color,
    string? AvatarUrl,
    string? Specialization,
    bool IsActive,
    int DisplayOrder,
    decimal CommissionPercent,
    List<EmployeeServiceResponse> Services);

public record EmployeeServiceResponse(
    Guid ServiceId,
    string ServiceName,
    decimal? EffectivePrice,
    int EffectiveDurationMinutes,
    decimal? OverridePrice,
    int? OverrideDurationMinutes);

public record CreateEmployeeRequest(
    [Required] Guid BusinessId,
    [Required, MaxLength(200)] string Name,
    [MaxLength(20)] string Color = "#6366f1",
    decimal CommissionPercent = 100m);

public record UpdateEmployeeRequest(
    [Required, MaxLength(200)] string Name,
    [MaxLength(20)] string Color,
    bool IsActive,
    int DisplayOrder,
    decimal CommissionPercent,
    List<UpsertEmployeeServiceRequest> Services,
    [MaxLength(500)] string? Specialization = null,
    [MaxLength(500)] string? AvatarUrl = null);

public record UpsertEmployeeServiceRequest(
    Guid ServiceId,
    decimal? OverridePrice,
    int? OverrideDurationMinutes);

// Minimal info for slot responses and appointment lists.
public record EmployeeSummary(Guid Id, string Name, string Color, string? AvatarUrl = null, string? Specialization = null);
