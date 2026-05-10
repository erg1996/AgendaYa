using AppointmentScheduler.Application.DTOs;
using AppointmentScheduler.Application.Interfaces;
using AppointmentScheduler.Application.Services;
using AppointmentScheduler.Domain.Entities;
using Moq;

namespace AppointmentScheduler.Tests.Services;

public class AvailabilityServiceTests
{
    private readonly Mock<IWorkingHoursRepository> _workingHoursRepo = new();
    private readonly Mock<IAppointmentRepository> _appointmentRepo = new();
    private readonly Mock<IServiceRepository> _serviceRepo = new();
    private readonly Mock<IBlockedDateRepository> _blockedDateRepo = new();
    private readonly Mock<IEmployeeRepository> _employeeRepo = new();
    private readonly AvailabilityService _sut;

    private readonly Guid _businessId = Guid.NewGuid();
    private readonly Guid _serviceId = Guid.NewGuid();
    private readonly Guid _employeeId = Guid.NewGuid();

    public AvailabilityServiceTests()
    {
        _sut = new AvailabilityService(
            _workingHoursRepo.Object,
            _appointmentRepo.Object,
            _serviceRepo.Object,
            _blockedDateRepo.Object,
            _employeeRepo.Object);
    }

    private void SetupEmployee(int durationMinutes = 60)
    {
        var emp = new Employee
        {
            Id = _employeeId,
            BusinessId = _businessId,
            IsActive = true,
            EmployeeServices = new List<EmployeeServiceLink>
            {
                new() { EmployeeId = _employeeId, ServiceId = _serviceId, OverrideDurationMinutes = durationMinutes }
            }
        };
        _serviceRepo.Setup(r => r.GetByIdAsync(_serviceId))
            .ReturnsAsync(new Service { Id = _serviceId, DurationMinutes = durationMinutes });
        _blockedDateRepo.Setup(r => r.GetByBusinessIdAndDateAsync(_businessId, It.IsAny<DateTime>()))
            .ReturnsAsync((BlockedDate?)null);
        _employeeRepo.Setup(r => r.GetByBusinessIdWithServicesAsync(_businessId))
            .ReturnsAsync(new List<Employee> { emp });
    }

    [Fact]
    public async Task GetSlots_NoAppointments_ReturnsAllSlots()
    {
        SetupEmployee(60);
        var date = new DateTime(2026, 4, 6); // Monday

        _workingHoursRepo.Setup(r => r.GetByEmployeeIdAndDayAsync(_employeeId, (int)date.DayOfWeek))
            .ReturnsAsync(new List<WorkingHours>
            {
                new() { StartTime = new TimeSpan(9, 0, 0), EndTime = new TimeSpan(17, 0, 0) }
            });
        _appointmentRepo.Setup(r => r.GetByEmployeeIdAndDateAsync(_employeeId, date))
            .ReturnsAsync(new List<Appointment>());

        var result = await _sut.GetAvailableSlotsAsync(_businessId, date, _serviceId);

        Assert.Equal(8, result.Count);
        Assert.Equal(date.AddHours(9), result[0].StartTime);
        Assert.Equal(date.AddHours(10), result[0].EndTime);
        Assert.Equal(date.AddHours(16), result[7].StartTime);
        Assert.Equal(date.AddHours(17), result[7].EndTime);
    }

    [Fact]
    public async Task GetSlots_WithAppointments_ExcludesBookedSlots()
    {
        SetupEmployee(60);
        var date = new DateTime(2026, 4, 6);

        _workingHoursRepo.Setup(r => r.GetByEmployeeIdAndDayAsync(_employeeId, (int)date.DayOfWeek))
            .ReturnsAsync(new List<WorkingHours>
            {
                new() { StartTime = new TimeSpan(9, 0, 0), EndTime = new TimeSpan(17, 0, 0) }
            });
        _appointmentRepo.Setup(r => r.GetByEmployeeIdAndDateAsync(_employeeId, date))
            .ReturnsAsync(new List<Appointment>
            {
                new() { AppointmentDate = date.AddHours(10), DurationMinutes = 60, Status = AppointmentStatus.Pending },
                new() { AppointmentDate = date.AddHours(14), DurationMinutes = 60, Status = AppointmentStatus.Pending }
            });

        var result = await _sut.GetAvailableSlotsAsync(_businessId, date, _serviceId);

        Assert.Equal(6, result.Count);
        Assert.DoesNotContain(result, s => s.StartTime == date.AddHours(10));
        Assert.DoesNotContain(result, s => s.StartTime == date.AddHours(14));
    }

    [Fact]
    public async Task GetSlots_ClosedDay_ReturnsEmpty()
    {
        SetupEmployee(30);
        var date = new DateTime(2026, 4, 5); // Sunday

        _workingHoursRepo.Setup(r => r.GetByEmployeeIdAndDayAsync(_employeeId, 0))
            .ReturnsAsync(new List<WorkingHours>());

        var result = await _sut.GetAvailableSlotsAsync(_businessId, date, _serviceId);

        Assert.Empty(result);
    }

    [Fact]
    public async Task GetSlots_UnevenDuration_TruncatesCorrectly()
    {
        // 9:00-17:00 = 480 min, 45-min service → 10 slots (last at 15:45-16:30)
        SetupEmployee(45);
        var date = new DateTime(2026, 4, 6);

        _workingHoursRepo.Setup(r => r.GetByEmployeeIdAndDayAsync(_employeeId, (int)date.DayOfWeek))
            .ReturnsAsync(new List<WorkingHours>
            {
                new() { StartTime = new TimeSpan(9, 0, 0), EndTime = new TimeSpan(17, 0, 0) }
            });
        _appointmentRepo.Setup(r => r.GetByEmployeeIdAndDateAsync(_employeeId, date))
            .ReturnsAsync(new List<Appointment>());

        var result = await _sut.GetAvailableSlotsAsync(_businessId, date, _serviceId);

        Assert.Equal(10, result.Count);
        var lastSlot = result[^1];
        Assert.Equal(date.Add(new TimeSpan(15, 45, 0)), lastSlot.StartTime);
        Assert.Equal(date.Add(new TimeSpan(16, 30, 0)), lastSlot.EndTime);
    }

    [Fact]
    public async Task GetSlots_AllSlotsBooked_ReturnsEmpty()
    {
        SetupEmployee(60);
        var date = new DateTime(2026, 4, 6);

        _workingHoursRepo.Setup(r => r.GetByEmployeeIdAndDayAsync(_employeeId, (int)date.DayOfWeek))
            .ReturnsAsync(new List<WorkingHours>
            {
                new() { StartTime = new TimeSpan(9, 0, 0), EndTime = new TimeSpan(11, 0, 0) }
            });
        _appointmentRepo.Setup(r => r.GetByEmployeeIdAndDateAsync(_employeeId, date))
            .ReturnsAsync(new List<Appointment>
            {
                new() { AppointmentDate = date.AddHours(9), DurationMinutes = 60, Status = AppointmentStatus.Pending },
                new() { AppointmentDate = date.AddHours(10), DurationMinutes = 60, Status = AppointmentStatus.Pending }
            });

        var result = await _sut.GetAvailableSlotsAsync(_businessId, date, _serviceId);

        Assert.Empty(result);
    }

    [Fact]
    public async Task GetSlots_PartialOverlap_ExcludesAffectedSlots()
    {
        // 30-min slots, existing 9:15-9:45 blocks both 9:00 and 9:30
        SetupEmployee(30);
        var date = new DateTime(2026, 4, 6);

        _workingHoursRepo.Setup(r => r.GetByEmployeeIdAndDayAsync(_employeeId, (int)date.DayOfWeek))
            .ReturnsAsync(new List<WorkingHours>
            {
                new() { StartTime = new TimeSpan(9, 0, 0), EndTime = new TimeSpan(10, 0, 0) }
            });
        _appointmentRepo.Setup(r => r.GetByEmployeeIdAndDateAsync(_employeeId, date))
            .ReturnsAsync(new List<Appointment>
            {
                new() { AppointmentDate = date.Add(new TimeSpan(9, 15, 0)), DurationMinutes = 30, Status = AppointmentStatus.Pending }
            });

        var result = await _sut.GetAvailableSlotsAsync(_businessId, date, _serviceId);

        Assert.Empty(result);
    }

    [Fact]
    public async Task GetSlots_BlockedDate_ReturnsEmpty()
    {
        SetupEmployee(60);
        var date = new DateTime(2026, 4, 6);

        _blockedDateRepo.Setup(r => r.GetByBusinessIdAndDateAsync(_businessId, date))
            .ReturnsAsync(new BlockedDate { BusinessId = _businessId, Date = date });

        var result = await _sut.GetAvailableSlotsAsync(_businessId, date, _serviceId);

        Assert.Empty(result);
    }
}
