using System.Globalization;
using AppointmentScheduler.Application.DTOs;
using AppointmentScheduler.Application.Exceptions;
using AppointmentScheduler.Application.Interfaces;
using AppointmentScheduler.Application.Utils;
using AppointmentScheduler.Domain.Entities;

namespace AppointmentScheduler.Application.Services;

public class WhatsAppBroadcastService
{
    private readonly IWhatsAppTemplateRepository _templateRepo;
    private readonly IBusinessRepository _bizRepo;
    private readonly IAppointmentRepository _appointmentRepo;

    public WhatsAppBroadcastService(
        IWhatsAppTemplateRepository templateRepo,
        IBusinessRepository bizRepo,
        IAppointmentRepository appointmentRepo)
    {
        _templateRepo = templateRepo;
        _bizRepo = bizRepo;
        _appointmentRepo = appointmentRepo;
    }

    // --- Template CRUD ---

    public async Task<List<WhatsAppTemplateResponse>> GetTemplatesAsync(Guid businessId)
    {
        var templates = await _templateRepo.GetByBusinessIdAsync(businessId);
        return templates.Select(ToResponse).ToList();
    }

    public async Task<WhatsAppTemplateResponse> CreateTemplateAsync(Guid businessId, CreateWhatsAppTemplateRequest request)
    {
        var template = new WhatsAppMessageTemplate
        {
            Id = Guid.NewGuid(),
            BusinessId = businessId,
            Name = request.Name.Trim(),
            Body = request.Body.Trim(),
            CreatedAt = DateTime.UtcNow
        };
        await _templateRepo.AddAsync(template);
        await _templateRepo.SaveChangesAsync();
        return ToResponse(template);
    }

    public async Task<WhatsAppTemplateResponse> UpdateTemplateAsync(Guid id, Guid businessId, UpdateWhatsAppTemplateRequest request)
    {
        var template = await _templateRepo.GetByIdAsync(id)
            ?? throw new NotFoundException("Template not found.");

        if (template.BusinessId != businessId)
            throw new ForbiddenException("Template does not belong to this business.");

        template.Name = request.Name.Trim();
        template.Body = request.Body.Trim();
        template.UpdatedAt = DateTime.UtcNow;
        await _templateRepo.SaveChangesAsync();
        return ToResponse(template);
    }

    public async Task DeleteTemplateAsync(Guid id, Guid businessId)
    {
        var template = await _templateRepo.GetByIdAsync(id)
            ?? throw new NotFoundException("Template not found.");

        if (template.BusinessId != businessId)
            throw new ForbiddenException("Template does not belong to this business.");

        await _templateRepo.DeleteAsync(template);
        await _templateRepo.SaveChangesAsync();
    }

    // --- Broadcast composer ---

    public async Task<BroadcastPreviewResponse> PreviewBroadcastAsync(Guid businessId, BroadcastPreviewRequest request)
    {
        var business = await _bizRepo.GetByIdAsync(businessId)
            ?? throw new NotFoundException("Business not found.");

        var allAppointments = await _appointmentRepo.GetByBusinessIdAsync(businessId);

        // Filter by recency and collect unique clients (by phone)
        var cutoff = request.DaysBack > 0
            ? DateTime.UtcNow.AddDays(-request.DaysBack)
            : DateTime.MinValue;

        var recipients = allAppointments
            .Where(a => a.CustomerPhone != null
                     && a.Status != AppointmentStatus.Cancelled
                     && a.AppointmentDate >= cutoff)
            .GroupBy(a => PhoneNormalizer.NormalizeForWaMe(a.CustomerPhone))
            .Where(g => g.Key != null)
            .Select(g =>
            {
                // Use most recent appointment for context
                var latest = g.OrderByDescending(a => a.AppointmentDate).First();
                return (
                    Phone: g.Key!,
                    Name: latest.CustomerName,
                    Service: latest.Service?.Name ?? string.Empty
                );
            })
            .ToList();

        var results = recipients.Select(r =>
        {
            var message = RenderBroadcast(request.Body, r.Name, business.Name, r.Service, request.Fecha);
            var waLink = WhatsAppTemplateRenderer.BuildWaUrl(r.Phone, message);
            return new BroadcastRecipientResult(r.Name, r.Phone, message, waLink);
        }).ToList();

        return new BroadcastPreviewResponse(results.Count, results);
    }

    private static string RenderBroadcast(string body, string customerName, string businessName, string serviceName, string? fecha)
    {
        var fechaValue = fecha?.Trim();
        if (string.IsNullOrWhiteSpace(fechaValue))
            fechaValue = DateTime.Now.ToString("d 'de' MMMM", new CultureInfo("es"));

        return body
            .Replace("{cliente}", customerName)
            .Replace("{negocio}", businessName)
            .Replace("{servicio}", serviceName)
            .Replace("{fecha}", fechaValue);
    }

    private static WhatsAppTemplateResponse ToResponse(WhatsAppMessageTemplate t) =>
        new(t.Id, t.Name, t.Body, t.CreatedAt, t.UpdatedAt);
}
