using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using AppointmentScheduler.Application.DTOs;
using AppointmentScheduler.Application.Exceptions;
using AppointmentScheduler.Application.Interfaces;
using AppointmentScheduler.Domain.Entities;

namespace AppointmentScheduler.Application.Services;

public class BusinessService
{
    private readonly IBusinessRepository _repository;
    private readonly IUserBusinessRepository _userBusinessRepository;

    public BusinessService(IBusinessRepository repository, IUserBusinessRepository userBusinessRepository)
    {
        _repository = repository;
        _userBusinessRepository = userBusinessRepository;
    }

    public async Task<BusinessResponse> CreateForUserAsync(Guid userId, CreateBusinessRequest request)
    {
        var slug = GenerateSlug(request.Name);
        var existing = await _repository.GetBySlugAsync(slug);
        if (existing != null)
            slug = $"{slug}-{Guid.NewGuid().ToString()[..4]}";

        var business = new Business
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            Slug = slug,
            CreatedAt = DateTime.UtcNow
        };

        await _repository.AddAsync(business);

        await _userBusinessRepository.AddAsync(new UserBusiness
        {
            UserId = userId,
            BusinessId = business.Id,
            CreatedAt = DateTime.UtcNow
        });

        await _repository.SaveChangesAsync();

        return ToResponse(business);
    }

    public async Task<BusinessResponse> GetByIdAsync(Guid id)
    {
        var business = await _repository.GetByIdAsync(id)
            ?? throw new NotFoundException($"Business with id '{id}' not found.");
        return ToResponse(business);
    }

    public async Task<BusinessResponse> GetBySlugAsync(string slug)
    {
        var business = await _repository.GetBySlugAsync(slug)
            ?? throw new NotFoundException($"Business with slug '{slug}' not found.");
        return ToResponse(business);
    }

    public async Task<List<BusinessResponse>> GetAllByUserIdAsync(Guid userId)
    {
        var businesses = await _userBusinessRepository.GetBusinessesByUserIdAsync(userId);
        return businesses.Select(ToResponse).ToList();
    }

    public async Task<BusinessResponse> UpdateAsync(Guid id, Guid userId, UpdateBusinessRequest request)
    {
        var hasAccess = await _userBusinessRepository.HasAccessAsync(userId, id);
        if (!hasAccess)
            throw new ForbiddenException("You do not have access to this business.");

        var business = await _repository.GetByIdAsync(id)
            ?? throw new NotFoundException($"Business with id '{id}' not found.");

        if (!string.IsNullOrWhiteSpace(request.Name))
            business.Name = request.Name.Trim();
        if (request.BrandColor != null)
            business.BrandColor = string.IsNullOrWhiteSpace(request.BrandColor) ? null : request.BrandColor.Trim();
        if (request.LogoUrl != null)
            business.LogoUrl = string.IsNullOrWhiteSpace(request.LogoUrl) ? null : request.LogoUrl.Trim();
        if (request.WhatsAppReminderTemplate != null)
            business.WhatsAppReminderTemplate = string.IsNullOrWhiteSpace(request.WhatsAppReminderTemplate) ? null : request.WhatsAppReminderTemplate.Trim();
        if (request.ClearLocation)
        {
            business.Latitude = null;
            business.Longitude = null;
            business.Address = null;
        }
        else if (request.Latitude.HasValue && request.Longitude.HasValue)
        {
            business.Latitude = request.Latitude;
            business.Longitude = request.Longitude;
            business.Address = string.IsNullOrWhiteSpace(request.Address) ? null : request.Address.Trim();
        }

        await _repository.SaveChangesAsync();

        return ToResponse(business);
    }

    public async Task ValidateOwnershipAsync(Guid userId, Guid businessId)
    {
        var hasAccess = await _userBusinessRepository.HasAccessAsync(userId, businessId);
        if (!hasAccess)
            throw new ForbiddenException("You do not have access to this business.");
    }

    private static BusinessResponse ToResponse(Business b) =>
        new(b.Id, b.Name, b.Slug, b.LogoUrl, b.BrandColor, b.WhatsAppReminderTemplate, b.CreatedAt, b.Address, b.Latitude, b.Longitude);

    public static string GenerateSlug(string name)
    {
        var normalized = name.Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder();
        foreach (var c in normalized)
        {
            var category = CharUnicodeInfo.GetUnicodeCategory(c);
            if (category != UnicodeCategory.NonSpacingMark)
                sb.Append(c);
        }

        var slug = sb.ToString().Normalize(NormalizationForm.FormC).ToLowerInvariant();
        slug = Regex.Replace(slug, @"[^a-z0-9]+", "-");
        slug = slug.Trim('-');
        return slug;
    }
}
