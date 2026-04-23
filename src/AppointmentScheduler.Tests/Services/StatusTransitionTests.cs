using AppointmentScheduler.Application.DTOs;
using AppointmentScheduler.Application.Exceptions;
using AppointmentScheduler.Application.Interfaces;
using AppointmentScheduler.Application.Services;
using AppointmentScheduler.Domain.Entities;
using FluentAssertions;
using Moq;
using Xunit;

namespace AppointmentScheduler.Tests.Services;

public class StatusTransitionTests
{
    private readonly Mock<IAppointmentRepository> _apptRepo = new();
    private readonly Mock<IServiceRepository> _svcRepo = new();
    private readonly Mock<IBusinessRepository> _bizRepo = new();
    private readonly Mock<IWorkingHoursRepository> _whRepo = new();
    private readonly Mock<IEmailService> _email = new();

    private AppointmentService BuildService() => new(
        _apptRepo.Object, _svcRepo.Object, _bizRepo.Object,
        _whRepo.Object, _email.Object,
        new AppointmentActionOptions("test-secret-32-chars-minimum!!", "http://localhost"));

    private Appointment MakeAppointment(AppointmentStatus status) => new()
    {
        Id = Guid.NewGuid(),
        BusinessId = Guid.NewGuid(),
        ServiceId = Guid.NewGuid(),
        CustomerName = "Test Client",
        AppointmentDate = DateTime.UtcNow.AddDays(1),
        DurationMinutes = 60,
        Status = status,
        CreatedAt = DateTime.UtcNow
    };

    // ── Valid transitions ──────────────────────────────────────────────────

    [Theory]
    [InlineData(AppointmentStatus.Pending, "Confirmed")]
    [InlineData(AppointmentStatus.Pending, "Cancelled")]
    [InlineData(AppointmentStatus.Pending, "NoShow")]
    [InlineData(AppointmentStatus.Confirmed, "Completed")]
    [InlineData(AppointmentStatus.Confirmed, "Cancelled")]
    [InlineData(AppointmentStatus.Confirmed, "NoShow")]
    public async Task ValidTransition_Succeeds(AppointmentStatus from, string to)
    {
        var appt = MakeAppointment(from);
        _apptRepo.Setup(r => r.GetByIdAsync(appt.Id)).ReturnsAsync(appt);
        _apptRepo.Setup(r => r.SaveChangesAsync()).Returns(Task.CompletedTask);

        var svc = BuildService();
        var result = await svc.UpdateStatusAsync(appt.Id, appt.BusinessId, to);

        result.Status.Should().Be(to);
    }

    // ── Invalid transitions (terminal states are final) ────────────────────

    [Theory]
    [InlineData(AppointmentStatus.Completed, "Confirmed")]
    [InlineData(AppointmentStatus.Completed, "Cancelled")]
    [InlineData(AppointmentStatus.Completed, "Pending")]
    [InlineData(AppointmentStatus.Cancelled, "Confirmed")]
    [InlineData(AppointmentStatus.Cancelled, "Completed")]
    [InlineData(AppointmentStatus.NoShow, "Confirmed")]
    [InlineData(AppointmentStatus.NoShow, "Cancelled")]
    public async Task InvalidTransition_ThrowsConflict(AppointmentStatus from, string to)
    {
        var appt = MakeAppointment(from);
        _apptRepo.Setup(r => r.GetByIdAsync(appt.Id)).ReturnsAsync(appt);

        var svc = BuildService();
        await svc.Invoking(s => s.UpdateStatusAsync(appt.Id, appt.BusinessId, to))
            .Should().ThrowAsync<ConflictException>();
    }

    // ── Ownership check ────────────────────────────────────────────────────

    [Fact]
    public async Task UpdateStatus_WrongBusiness_ThrowsForbidden()
    {
        var appt = MakeAppointment(AppointmentStatus.Pending);
        _apptRepo.Setup(r => r.GetByIdAsync(appt.Id)).ReturnsAsync(appt);

        var svc = BuildService();
        await svc.Invoking(s => s.UpdateStatusAsync(appt.Id, Guid.NewGuid(), "Confirmed"))
            .Should().ThrowAsync<ForbiddenException>();
    }

    // ── Not found ─────────────────────────────────────────────────────────

    [Fact]
    public async Task UpdateStatus_NotFound_ThrowsNotFound()
    {
        _apptRepo.Setup(r => r.GetByIdAsync(It.IsAny<Guid>())).ReturnsAsync((Appointment?)null);

        var svc = BuildService();
        await svc.Invoking(s => s.UpdateStatusAsync(Guid.NewGuid(), Guid.NewGuid(), "Confirmed"))
            .Should().ThrowAsync<NotFoundException>();
    }
}
