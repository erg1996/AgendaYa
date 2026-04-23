using AppointmentScheduler.Application.Interfaces;
using AppointmentScheduler.Application.Services;
using AppointmentScheduler.Application.Utils;
using AppointmentScheduler.Domain.Entities;
using Moq;

namespace AppointmentScheduler.Tests.Services;

public class AppointmentActionFlowTests
{
    private const string Secret = "test-secret-key-min-32-chars-long-123";

    private readonly Mock<IAppointmentRepository> _apptRepo = new();
    private readonly Mock<IServiceRepository> _svcRepo = new();
    private readonly Mock<IBusinessRepository> _bizRepo = new();
    private readonly Mock<IWorkingHoursRepository> _whRepo = new();
    private readonly Mock<IEmailService> _email = new();
    private readonly AppointmentService _sut;

    public AppointmentActionFlowTests()
    {
        _sut = new AppointmentService(
            _apptRepo.Object, _svcRepo.Object, _bizRepo.Object, _whRepo.Object, _email.Object,
            new AppointmentActionOptions(Secret, "http://localhost"));
    }

    private Appointment MakeAppointment(AppointmentStatus status)
    {
        var id = Guid.NewGuid();
        var bizId = Guid.NewGuid();
        var a = new Appointment
        {
            Id = id,
            BusinessId = bizId,
            ServiceId = Guid.NewGuid(),
            CustomerName = "Ana",
            AppointmentDate = new DateTime(2026, 5, 1, 10, 0, 0),
            DurationMinutes = 30,
            Status = status,
            Service = new Service { Name = "Corte" }
        };
        _apptRepo.Setup(r => r.GetByIdAsync(id)).ReturnsAsync(a);
        _bizRepo.Setup(r => r.GetByIdAsync(bizId)).ReturnsAsync(new Business { Id = bizId, Name = "Barbería Eduardo" });
        return a;
    }

    [Fact]
    public async Task Confirm_PendingAppointment_MovesToConfirmed()
    {
        var a = MakeAppointment(AppointmentStatus.Pending);
        var token = AppointmentActionToken.Generate(a.Id, AppointmentAction.Confirm, DateTimeOffset.UtcNow.AddHours(1), Secret);

        var result = await _sut.ApplyActionByTokenAsync(token);

        Assert.Equal(AppointmentActionOutcome.Confirmed, result.Outcome);
        Assert.Equal(AppointmentStatus.Confirmed, a.Status);
        _apptRepo.Verify(r => r.SaveChangesAsync(), Times.Once);
    }

    [Fact]
    public async Task Confirm_AlreadyConfirmed_NoOp()
    {
        var a = MakeAppointment(AppointmentStatus.Confirmed);
        var token = AppointmentActionToken.Generate(a.Id, AppointmentAction.Confirm, DateTimeOffset.UtcNow.AddHours(1), Secret);

        var result = await _sut.ApplyActionByTokenAsync(token);

        Assert.Equal(AppointmentActionOutcome.Confirmed, result.Outcome);
        _apptRepo.Verify(r => r.SaveChangesAsync(), Times.Never);
    }

    [Fact]
    public async Task Confirm_Cancelled_ReportsAlreadyCancelled()
    {
        var a = MakeAppointment(AppointmentStatus.Cancelled);
        var token = AppointmentActionToken.Generate(a.Id, AppointmentAction.Confirm, DateTimeOffset.UtcNow.AddHours(1), Secret);

        var result = await _sut.ApplyActionByTokenAsync(token);

        Assert.Equal(AppointmentActionOutcome.AlreadyCancelled, result.Outcome);
        Assert.Equal(AppointmentStatus.Cancelled, a.Status);
    }

    [Fact]
    public async Task Cancel_PendingAppointment_MovesToCancelled()
    {
        var a = MakeAppointment(AppointmentStatus.Pending);
        var token = AppointmentActionToken.Generate(a.Id, AppointmentAction.Cancel, DateTimeOffset.UtcNow.AddHours(1), Secret);

        var result = await _sut.ApplyActionByTokenAsync(token);

        Assert.Equal(AppointmentActionOutcome.Cancelled, result.Outcome);
        Assert.Equal(AppointmentStatus.Cancelled, a.Status);
    }

    [Fact]
    public async Task InvalidToken_ReturnsInvalid()
    {
        var result = await _sut.ApplyActionByTokenAsync("gibberish");
        Assert.Equal(AppointmentActionOutcome.InvalidOrExpired, result.Outcome);
    }

    [Fact]
    public async Task Cancel_Completed_ReportsAlreadyCompleted()
    {
        var a = MakeAppointment(AppointmentStatus.Completed);
        var token = AppointmentActionToken.Generate(a.Id, AppointmentAction.Cancel, DateTimeOffset.UtcNow.AddHours(1), Secret);

        var result = await _sut.ApplyActionByTokenAsync(token);

        Assert.Equal(AppointmentActionOutcome.AlreadyCompleted, result.Outcome);
        Assert.Equal(AppointmentStatus.Completed, a.Status);
    }
}
