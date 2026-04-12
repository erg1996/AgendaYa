using System.ComponentModel.DataAnnotations;

namespace AppointmentScheduler.Application.DTOs;

public record RegisterRequest(
    [Required, EmailAddress, MaxLength(200)] string Email,
    [Required, MinLength(8), MaxLength(100)] string Password,
    [Required, MaxLength(200)] string FullName,
    [Required, MaxLength(200)] string BusinessName,
    [Required, MaxLength(100)] string InviteCode);

public record LoginRequest(
    [Required, EmailAddress] string Email,
    [Required] string Password);

public record AuthResponse(string Token, Guid UserId, string Email, string FullName, Guid BusinessId, string BusinessName, string BusinessSlug);
