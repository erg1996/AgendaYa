using AppointmentScheduler.Application.DTOs;
using AppointmentScheduler.Application.Exceptions;
using AppointmentScheduler.Application.Interfaces;

namespace AppointmentScheduler.Application.Services;

public class AccountService
{
    private readonly IUserRepository _userRepo;
    private readonly IBusinessRepository _bizRepo;
    private readonly IAppointmentRepository _appointmentRepo;

    public AccountService(
        IUserRepository userRepo,
        IBusinessRepository bizRepo,
        IAppointmentRepository appointmentRepo)
    {
        _userRepo = userRepo;
        _bizRepo = bizRepo;
        _appointmentRepo = appointmentRepo;
    }

    public async Task<GdprExportDto> ExportMyDataAsync(Guid userId)
    {
        var user = await _userRepo.GetByIdAsync(userId)
            ?? throw new NotFoundException("User not found.");

        var business = await _bizRepo.GetByIdAsync(user.BusinessId)
            ?? throw new NotFoundException("Business not found.");

        var appointments = await _appointmentRepo.GetByBusinessIdAsync(business.Id);

        return new GdprExportDto(
            User: new GdprUserDto(user.Id, user.Email, user.FullName, user.CreatedAt),
            Business: new GdprBusinessDto(business.Id, business.Name, business.Slug, business.CreatedAt),
            Appointments: appointments.Select(a => new GdprAppointmentDto(
                a.Id,
                a.CustomerName,
                a.CustomerEmail,
                a.CustomerPhone,
                a.AppointmentDate,
                a.DurationMinutes,
                a.Status.ToString(),
                a.Notes,
                a.CreatedAt,
                a.Service?.Name ?? string.Empty
            )).ToList()
        );
    }

    public async Task DeleteAccountAsync(Guid userId, string password)
    {
        var user = await _userRepo.GetByIdAsync(userId)
            ?? throw new NotFoundException("User not found.");

        if (!BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
            throw new ForbiddenException("Contraseña incorrecta.");

        var businessId = user.BusinessId;

        // Delete user first (EF cascade removes UserBusiness rows).
        // Business.Users FK is Restrict, so user must go before business.
        await _userRepo.DeleteAsync(user);
        await _userRepo.SaveChangesAsync();

        // Delete business — EF cascade removes appointments, services, working hours, blocked dates.
        var business = await _bizRepo.GetByIdAsync(businessId);
        if (business != null)
        {
            await _bizRepo.DeleteAsync(business);
            await _bizRepo.SaveChangesAsync();
        }
    }
}
