using System.ComponentModel.DataAnnotations;

namespace AppointmentScheduler.Application.DTOs;

public record CreateBusinessRequest([Required, MaxLength(200)] string Name);

public record UpdateBusinessRequest(
    [MaxLength(200)] string? Name,
    [MaxLength(20)] string? BrandColor,
    [MaxLength(500)] string? LogoUrl,
    [MaxLength(2000)] string? WhatsAppReminderTemplate);

public record BusinessResponse(Guid Id, string Name, string Slug, string? LogoUrl, string? BrandColor, string? WhatsAppReminderTemplate, DateTime CreatedAt);
