using AppointmentScheduler.Application.DTOs;
using AppointmentScheduler.Application.Exceptions;
using AppointmentScheduler.Application.Interfaces;
using AppointmentScheduler.Application.Services;
using AppointmentScheduler.Domain.Entities;
using Moq;

namespace AppointmentScheduler.Tests.Services;

public class AppointmentServiceTests
{
    private readonly Mock<IAppointmentRepository> _appointmentRepo = new();
    private readonly Mock<IServiceRepository> _serviceRepo = new();
    private readonly Mock<IBusinessRepository> _businessRepo = new();
    private readonly Mock<IWorkingHoursRepository> _workingHoursRepo = new();
    private readonly Mock<IEmailService> _emailService = new();
    private readonly AppointmentService _sut;

    private readonly Guid _businessId = Guid.NewGuid();
    private readonly Guid _serviceId = Guid.NewGuid();

    public AppointmentServiceTests()
    {
        _sut = new AppointmentService(
            _appointmentRepo.Object,
            _serviceRepo.Object,
            _businessRepo.Object,
            _workingHoursRepo.Object,
            _emailService.Object);

        // Default setup: business and service exist, working hours Mon 9-17
        _businessRepo.Setup(r => r.GetByIdAsync(_businessId))
            .ReturnsAsync(new Business { Id = _businessId, Name = "Test" });

        _serviceRepo.Setup(r => r.GetByIdAsync(_serviceId))
            .ReturnsAsync(new Service { Id = _serviceId, BusinessId = _businessId, DurationMinutes = 30 });

        _workingHoursRepo.Setup(r => r.GetByBusinessIdAndDayAsync(_businessId, It.IsAny<int>()))
            .ReturnsAsync(new List<WorkingHours>
            {
                new() { StartTime = new TimeSpan(9, 0, 0), EndTime = new TimeSpan(17, 0, 0) }
            });
    }

    [Fact]
    public async Task Create_NoConflict_Succeeds()
    {
        var date = new DateTime(2026, 4, 6, 10, 0, 0); // Monday 10:00
        _appointmentRepo.Setup(r => r.GetByBusinessIdAndDateAsync(_businessId, date))
            .ReturnsAsync(new List<Appointment>());

        var request = new CreateAppointmentRequest(_businessId, _serviceId, "John Doe", null, null, date);
        var result = await _sut.CreateAsync(request);

        Assert.Equal("John Doe", result.CustomerName);
        Assert.Equal(date, result.AppointmentDate);
        Assert.Equal(30, result.DurationMinutes);
        _appointmentRepo.Verify(r => r.AddAsync(It.IsAny<Appointment>()), Times.Once);
        _appointmentRepo.Verify(r => r.SaveChangesAsync(), Times.Once);
    }

    [Fact]
    public async Task Create_ExactOverlap_ThrowsConflict()
    {
        var date = new DateTime(2026, 4, 6, 10, 0, 0);
        _appointmentRepo.Setup(r => r.GetByBusinessIdAndDateAsync(_businessId, date))
            .ReturnsAsync(new List<Appointment>
            {
                new() { AppointmentDate = date, DurationMinutes = 30 } // 10:00-10:30
            });

        var request = new CreateAppointmentRequest(_businessId, _serviceId, "Jane Doe", null, null, date);

        await Assert.ThrowsAsync<ConflictException>(() => _sut.CreateAsync(request));
    }

    [Fact]
    public async Task Create_PartialOverlap_ThrowsConflict()
    {
        var date = new DateTime(2026, 4, 6, 10, 0, 0);
        _appointmentRepo.Setup(r => r.GetByBusinessIdAndDateAsync(_businessId, date))
            .ReturnsAsync(new List<Appointment>
            {
                new() { AppointmentDate = date.AddMinutes(-15), DurationMinutes = 30 } // 9:45-10:15
            });

        var request = new CreateAppointmentRequest(_businessId, _serviceId, "Jane Doe", null, null, date);

        await Assert.ThrowsAsync<ConflictException>(() => _sut.CreateAsync(request));
    }

    [Fact]
    public async Task Create_AdjacentSlots_Succeeds()
    {
        // Existing 10:00-10:30, new 10:30-11:00 → no overlap (half-open intervals)
        var date = new DateTime(2026, 4, 6, 10, 30, 0);
        _appointmentRepo.Setup(r => r.GetByBusinessIdAndDateAsync(_businessId, date))
            .ReturnsAsync(new List<Appointment>
            {
                new() { AppointmentDate = date.AddMinutes(-30), DurationMinutes = 30 } // 10:00-10:30
            });

        var request = new CreateAppointmentRequest(_businessId, _serviceId, "John Doe", null, null, date);
        var result = await _sut.CreateAsync(request);

        Assert.Equal(date, result.AppointmentDate);
        _appointmentRepo.Verify(r => r.AddAsync(It.IsAny<Appointment>()), Times.Once);
    }

    [Fact]
    public async Task Create_OutsideWorkingHours_ThrowsConflict()
    {
        var date = new DateTime(2026, 4, 6, 7, 0, 0); // 7:00 AM, before 9 AM open
        _appointmentRepo.Setup(r => r.GetByBusinessIdAndDateAsync(_businessId, date))
            .ReturnsAsync(new List<Appointment>());

        var request = new CreateAppointmentRequest(_businessId, _serviceId, "Jane Doe", null, null, date);

        await Assert.ThrowsAsync<ConflictException>(() => _sut.CreateAsync(request));
    }

    [Fact]
    public async Task Create_ClosedDay_ThrowsConflict()
    {
        var sundayBusinessId = Guid.NewGuid();
        _businessRepo.Setup(r => r.GetByIdAsync(sundayBusinessId))
            .ReturnsAsync(new Business { Id = sundayBusinessId });
        _serviceRepo.Setup(r => r.GetByIdAsync(_serviceId))
            .ReturnsAsync(new Service { Id = _serviceId, DurationMinutes = 30 });
        _workingHoursRepo.Setup(r => r.GetByBusinessIdAndDayAsync(sundayBusinessId, 0))
            .ReturnsAsync(new List<WorkingHours>());

        var date = new DateTime(2026, 4, 5, 10, 0, 0); // Sunday
        var request = new CreateAppointmentRequest(sundayBusinessId, _serviceId, "Jane Doe", null, null, date);

        await Assert.ThrowsAsync<ConflictException>(() => _sut.CreateAsync(request));
    }
}
