using AppointmentScheduler.Application.DTOs;
using AppointmentScheduler.Application.Interfaces;
using AppointmentScheduler.Application.Services;
using Moq;

namespace AppointmentScheduler.Tests.Services;

public class AdminServiceTests
{
    private readonly Mock<IAdminRepository> _repo = new();
    private readonly AdminService _sut;

    public AdminServiceTests()
    {
        _sut = new AdminService(_repo.Object);
    }

    [Fact]
    public async Task GetOverview_DelegatesToRepository()
    {
        var expected = new AdminOverviewDto(2, 3, 10, 4, 5, 1, 1500m, 1, 2, 3, 7, 800m);
        _repo.Setup(r => r.GetOverviewAsync(It.IsAny<DateTime>())).ReturnsAsync(expected);

        var result = await _sut.GetOverviewAsync();

        Assert.Same(expected, result);
        _repo.Verify(r => r.GetOverviewAsync(It.IsAny<DateTime>()), Times.Once);
    }

    [Fact]
    public async Task GetBusinesses_DelegatesToRepository()
    {
        var rows = new List<AdminBusinessRowDto>
        {
            new(Guid.NewGuid(), "A", "a", DateTime.UtcNow, 1, 5, 2, 2, 1, 1, 3, 100m, DateTime.UtcNow)
        };
        _repo.Setup(r => r.GetBusinessesAsync(It.IsAny<DateTime>())).ReturnsAsync(rows);

        var result = await _sut.GetBusinessesAsync();

        Assert.Single(result);
        Assert.Equal("A", result[0].Name);
    }

    [Fact]
    public async Task GetBusinessDetail_ReturnsNullWhenMissing()
    {
        _repo.Setup(r => r.GetBusinessDetailAsync(It.IsAny<Guid>(), It.IsAny<DateTime>()))
            .ReturnsAsync((AdminBusinessDetailDto?)null);

        var result = await _sut.GetBusinessDetailAsync(Guid.NewGuid());

        Assert.Null(result);
    }

    [Fact]
    public async Task GetRecentActivity_ClampsLimitToMax()
    {
        _repo.Setup(r => r.GetRecentActivityAsync(It.IsAny<int>()))
            .ReturnsAsync(new List<AdminActivityItemDto>());

        await _sut.GetRecentActivityAsync(9999);

        _repo.Verify(r => r.GetRecentActivityAsync(200), Times.Once);
    }

    [Fact]
    public async Task GetRecentActivity_ClampsLimitToMin()
    {
        _repo.Setup(r => r.GetRecentActivityAsync(It.IsAny<int>()))
            .ReturnsAsync(new List<AdminActivityItemDto>());

        await _sut.GetRecentActivityAsync(0);

        _repo.Verify(r => r.GetRecentActivityAsync(1), Times.Once);
    }

    [Fact]
    public async Task GetRecentActivity_DefaultLimitIs50()
    {
        _repo.Setup(r => r.GetRecentActivityAsync(It.IsAny<int>()))
            .ReturnsAsync(new List<AdminActivityItemDto>());

        await _sut.GetRecentActivityAsync();

        _repo.Verify(r => r.GetRecentActivityAsync(50), Times.Once);
    }
}
