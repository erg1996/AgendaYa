using System.ComponentModel.DataAnnotations;

namespace AppointmentScheduler.Application.DTOs;

// --- Template CRUD ---

public record WhatsAppTemplateResponse(
    Guid Id,
    string Name,
    string Body,
    DateTime CreatedAt,
    DateTime? UpdatedAt);

public record CreateWhatsAppTemplateRequest(
    [Required, MaxLength(200)] string Name,
    [Required, MaxLength(4096)] string Body);

public record UpdateWhatsAppTemplateRequest(
    [Required, MaxLength(200)] string Name,
    [Required, MaxLength(4096)] string Body);

// --- Broadcast composer ---

/// <summary>
/// Request to preview/compose a broadcast message.
/// Optional variables can be injected into placeholders that aren't client-specific.
/// </summary>
public record BroadcastPreviewRequest(
    [Required] string Body,
    /// <summary>Value to inject into {fecha} placeholder, e.g. "25 de diciembre"</summary>
    string? Fecha,
    /// <summary>How many days back to look for unique clients. 0 = all time.</summary>
    int DaysBack = 90);

/// <summary>A single recipient with a ready-to-open wa.me link.</summary>
public record BroadcastRecipientResult(
    string CustomerName,
    string Phone,
    string RenderedMessage,
    string WaLink);

public record BroadcastPreviewResponse(
    int RecipientCount,
    List<BroadcastRecipientResult> Recipients);
