using System.ComponentModel.DataAnnotations;

namespace AppointmentScheduler.Application.DTOs;

public record CreateServiceRequest(
    [Required] Guid BusinessId,
    [Required, MaxLength(200)] string Name,
    [Range(5, 480)] int DurationMinutes,
    [Range(0, 100000)] decimal? Price);

public record ServiceResponse(Guid Id, Guid BusinessId, string Name, int DurationMinutes, decimal? Price);
