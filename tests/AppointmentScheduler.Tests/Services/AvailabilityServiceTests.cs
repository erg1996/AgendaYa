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
    private readonly AvailabilityService _sut;

    public AvailabilityServiceTests()
    {
        _sut = new AvailabilityService(
            _workingHoursRepo.Object,
            _appointmentRepo.Object,
            _serviceRepo.Object,
            _blockedDateRepo.Object);
    }

    [Fact]
    public void GenerateSlots_NoAppointments_ReturnsAllSlots()
    {
        // 9:00-17:00, 60-min service → 8 slots
        var date = new DateTime(2026, 4, 6); // Monday
        var wh = new WorkingHours
        {
            StartTime = new TimeSpan(9, 0, 0),
            EndTime = new TimeSpan(17, 0, 0)
        };

        var result = AvailabilityService.GenerateAvailableSlots(date, wh, 60, new List<Appointment>());

        Assert.Equal(8, result.Count);
        Assert.Equal(date.AddHours(9), result[0].StartTime);
        Assert.Equal(date.AddHours(10), result[0].EndTime);
        Assert.Equal(date.AddHours(16), result[7].StartTime);
        Assert.Equal(date.AddHours(17), result[7].EndTime);
    }

    [Fact]
    public void GenerateSlots_WithAppointments_ExcludesBookedSlots()
    {
        var date = new DateTime(2026, 4, 6);
        var wh = new WorkingHours
        {
            StartTime = new TimeSpan(9, 0, 0),
            EndTime = new TimeSpan(17, 0, 0)
        };
        var existing = new List<Appointment>
        {
            new() { AppointmentDate = date.AddHours(10), DurationMinutes = 60 }, // 10:00-11:00
            new() { AppointmentDate = date.AddHours(14), DurationMinutes = 60 }  // 14:00-15:00
        };

        var result = AvailabilityService.GenerateAvailableSlots(date, wh, 60, existing);

        Assert.Equal(6, result.Count);
        Assert.DoesNotContain(result, s => s.StartTime == date.AddHours(10));
        Assert.DoesNotContain(result, s => s.StartTime == date.AddHours(14));
    }

    [Fact]
    public async Task GetSlots_ClosedDay_ReturnsEmpty()
    {
        var businessId = Guid.NewGuid();
        var serviceId = Guid.NewGuid();
        var date = new DateTime(2026, 4, 5); // Sunday

        _serviceRepo.Setup(r => r.GetByIdAsync(serviceId))
            .ReturnsAsync(new Service { Id = serviceId, DurationMinutes = 30 });
        _workingHoursRepo.Setup(r => r.GetByBusinessIdAndDayAsync(businessId, 0))
            .ReturnsAsync(new List<WorkingHours>());

        var result = await _sut.GetAvailableSlotsAsync(businessId, date, serviceId);

        Assert.Empty(result);
    }

    [Fact]
    public void GenerateSlots_UnevenDuration_TruncatesCorrectly()
    {
        // 9:00-17:00 = 480 min, 45-min service → 10 slots (last at 16:15-17:00)
        var date = new DateTime(2026, 4, 6);
        var wh = new WorkingHours
        {
            StartTime = new TimeSpan(9, 0, 0),
            EndTime = new TimeSpan(17, 0, 0)
        };

        var result = AvailabilityService.GenerateAvailableSlots(date, wh, 45, new List<Appointment>());

        Assert.Equal(10, result.Count);
        var lastSlot = result[^1];
        // 9:00 + (9 * 45min) = 15:45, ends at 16:30
        Assert.Equal(date.Add(new TimeSpan(15, 45, 0)), lastSlot.StartTime);
        Assert.Equal(date.Add(new TimeSpan(16, 30, 0)), lastSlot.EndTime);
    }

    [Fact]
    public void GenerateSlots_AllSlotsBooked_ReturnsEmpty()
    {
        // 9:00-11:00, 60-min service, both slots booked
        var date = new DateTime(2026, 4, 6);
        var wh = new WorkingHours
        {
            StartTime = new TimeSpan(9, 0, 0),
            EndTime = new TimeSpan(11, 0, 0)
        };
        var existing = new List<Appointment>
        {
            new() { AppointmentDate = date.AddHours(9), DurationMinutes = 60 },
            new() { AppointmentDate = date.AddHours(10), DurationMinutes = 60 }
        };

        var result = AvailabilityService.GenerateAvailableSlots(date, wh, 60, existing);

        Assert.Empty(result);
    }

    [Fact]
    public void GenerateSlots_PartialOverlap_ExcludesAffectedSlot()
    {
        // 30-min slots, existing appointment 9:15-9:45 should block both 9:00 and 9:30 slots
        var date = new DateTime(2026, 4, 6);
        var wh = new WorkingHours
        {
            StartTime = new TimeSpan(9, 0, 0),
            EndTime = new TimeSpan(10, 0, 0)
        };
        var existing = new List<Appointment>
        {
            new() { AppointmentDate = date.Add(new TimeSpan(9, 15, 0)), DurationMinutes = 30 } // 9:15-9:45
        };

        var result = AvailabilityService.GenerateAvailableSlots(date, wh, 30, existing);

        // Slots: 9:00-9:30 (overlaps 9:15-9:45), 9:30-10:00 (overlaps 9:15-9:45)
        // Both should be blocked
        Assert.Empty(result);
    }
}
