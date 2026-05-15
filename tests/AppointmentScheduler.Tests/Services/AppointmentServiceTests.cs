using AppointmentScheduler.Application.DTOs;
using AppointmentScheduler.Application.Exceptions;
using AppointmentScheduler.Application.Interfaces;
using AppointmentScheduler.Application.Services;
using AppointmentScheduler.Domain.Entities;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;

namespace AppointmentScheduler.Tests.Services;

public class AppointmentServiceTests
{
    private readonly Mock<IAppointmentRepository> _appointmentRepo = new();
    private readonly Mock<IServiceRepository> _serviceRepo = new();
    private readonly Mock<IBusinessRepository> _businessRepo = new();
    private readonly Mock<IWorkingHoursRepository> _workingHoursRepo = new();
    private readonly Mock<IEmployeeRepository> _employeeRepo = new();
    private readonly Mock<IEmailService> _emailService = new();
    private readonly Mock<IServiceScopeFactory> _scopeFactory = new();
    private readonly AppointmentActionOptions _actionOptions = new("test-secret-key-min-32-chars-long-123", "http://localhost");
    private readonly AppointmentService _sut;

    private readonly Guid _businessId = Guid.NewGuid();
    private readonly Guid _serviceId = Guid.NewGuid();
    private readonly Guid _employeeId = Guid.NewGuid();

    public AppointmentServiceTests()
    {
        _sut = new AppointmentService(
            _appointmentRepo.Object,
            _serviceRepo.Object,
            _businessRepo.Object,
            _workingHoursRepo.Object,
            _employeeRepo.Object,
            _emailService.Object,
            _actionOptions,
            _scopeFactory.Object,
            Options.Create(new FeatureFlags()),
            NullLogger<AppointmentService>.Instance);

        var employee = new Employee
        {
            Id = _employeeId,
            BusinessId = _businessId,
            Name = "Principal",
            IsActive = true,
            EmployeeServices = new List<EmployeeServiceLink>
            {
                new() { EmployeeId = _employeeId, ServiceId = _serviceId }
            }
        };

        _businessRepo.Setup(r => r.GetByIdAsync(_businessId))
            .ReturnsAsync(new Business { Id = _businessId, Name = "Test" });

        _serviceRepo.Setup(r => r.GetByIdAsync(_serviceId))
            .ReturnsAsync(new Service { Id = _serviceId, BusinessId = _businessId, DurationMinutes = 30 });

        _employeeRepo.Setup(r => r.GetByBusinessIdWithServicesAsync(_businessId))
            .ReturnsAsync(new List<Employee> { employee });

        _workingHoursRepo.Setup(r => r.GetByEmployeeIdAndDayAsync(_employeeId, It.IsAny<int>()))
            .ReturnsAsync(new List<WorkingHours>
            {
                new() { StartTime = new TimeSpan(9, 0, 0), EndTime = new TimeSpan(17, 0, 0) }
            });

        _appointmentRepo.Setup(r => r.TryCreateWithOverlapCheckAsync(It.IsAny<Appointment>()))
            .ReturnsAsync(true);
    }

    [Fact]
    public async Task Create_NoConflict_Succeeds()
    {
        var date = new DateTime(2026, 4, 6, 10, 0, 0); // Monday 10:00
        var request = new CreateAppointmentRequest(_businessId, _serviceId, null, "John Doe", null, null, date);

        var result = await _sut.CreateAsync(request);

        Assert.Equal("John Doe", result.CustomerName);
        Assert.Equal(date, result.AppointmentDate);
        Assert.Equal(30, result.DurationMinutes);
        _appointmentRepo.Verify(r => r.TryCreateWithOverlapCheckAsync(It.IsAny<Appointment>()), Times.Once);
    }

    [Fact]
    public async Task Create_RepoReportsConflict_ThrowsConflict()
    {
        _appointmentRepo.Setup(r => r.TryCreateWithOverlapCheckAsync(It.IsAny<Appointment>()))
            .ReturnsAsync(false);

        var date = new DateTime(2026, 4, 6, 10, 0, 0);
        var request = new CreateAppointmentRequest(_businessId, _serviceId, null, "Jane Doe", null, null, date);

        await Assert.ThrowsAsync<ConflictException>(() => _sut.CreateAsync(request));
    }

    [Fact]
    public async Task Create_OutsideWorkingHours_ThrowsConflict_WithoutReachingRepo()
    {
        var date = new DateTime(2026, 4, 6, 7, 0, 0); // 7:00 AM, before 9 AM open
        var request = new CreateAppointmentRequest(_businessId, _serviceId, null, "Jane Doe", null, null, date);

        await Assert.ThrowsAsync<ConflictException>(() => _sut.CreateAsync(request));
        _appointmentRepo.Verify(r => r.TryCreateWithOverlapCheckAsync(It.IsAny<Appointment>()), Times.Never);
    }

    [Fact]
    public async Task Create_ClosedDay_ThrowsConflict()
    {
        var sundayBusinessId = Guid.NewGuid();
        var sundayEmployeeId = Guid.NewGuid();

        _businessRepo.Setup(r => r.GetByIdAsync(sundayBusinessId))
            .ReturnsAsync(new Business { Id = sundayBusinessId });
        _serviceRepo.Setup(r => r.GetByIdAsync(_serviceId))
            .ReturnsAsync(new Service { Id = _serviceId, DurationMinutes = 30 });

        var emp = new Employee
        {
            Id = sundayEmployeeId,
            BusinessId = sundayBusinessId,
            IsActive = true,
            EmployeeServices = new List<EmployeeServiceLink>
            {
                new() { EmployeeId = sundayEmployeeId, ServiceId = _serviceId }
            }
        };
        _employeeRepo.Setup(r => r.GetByBusinessIdWithServicesAsync(sundayBusinessId))
            .ReturnsAsync(new List<Employee> { emp });
        _workingHoursRepo.Setup(r => r.GetByEmployeeIdAndDayAsync(sundayEmployeeId, 0))
            .ReturnsAsync(new List<WorkingHours>());

        var date = new DateTime(2026, 4, 5, 10, 0, 0); // Sunday
        var request = new CreateAppointmentRequest(sundayBusinessId, _serviceId, null, "Jane Doe", null, null, date);

        await Assert.ThrowsAsync<ConflictException>(() => _sut.CreateAsync(request));
    }
}
