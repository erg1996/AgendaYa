using AppointmentScheduler.Application.DTOs;
using AppointmentScheduler.Application.Interfaces;
using AppointmentScheduler.Domain.Entities;
using AppointmentScheduler.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AppointmentScheduler.Infrastructure.Repositories;

public class AdminRepository : IAdminRepository
{
    private readonly AppDbContext _db;

    public AdminRepository(AppDbContext db) => _db = db;

    public async Task<AdminOverviewDto> GetOverviewAsync(DateTime now)
    {
        var d7 = now.AddDays(-7);
        var d30 = now.AddDays(-30);

        var totalBusinesses = await _db.Businesses.CountAsync();
        var totalUsers = await _db.Users.CountAsync();

        var apptQ = _db.Appointments.AsQueryable();
        var totalAppointments = await apptQ.CountAsync();
        var active = await apptQ.CountAsync(a => a.Status == AppointmentStatus.Pending || a.Status == AppointmentStatus.Confirmed);
        var completed = await apptQ.CountAsync(a => a.Status == AppointmentStatus.Completed);
        var cancelled = await apptQ.CountAsync(a => a.Status == AppointmentStatus.Cancelled);

        var totalRevenue = await (
            from a in _db.Appointments.IgnoreQueryFilters()
            join s in _db.Services.IgnoreQueryFilters() on a.ServiceId equals s.Id
            where a.Status == AppointmentStatus.Completed
            select (decimal?)s.Price ?? 0m
        ).SumAsync();

        var revenue30d = await (
            from a in _db.Appointments.IgnoreQueryFilters()
            join s in _db.Services.IgnoreQueryFilters() on a.ServiceId equals s.Id
            where a.Status == AppointmentStatus.Completed && a.AppointmentDate >= d30
            select (decimal?)s.Price ?? 0m
        ).SumAsync();

        var newBiz7d = await _db.Businesses.CountAsync(b => b.CreatedAt >= d7);
        var newBiz30d = await _db.Businesses.CountAsync(b => b.CreatedAt >= d30);
        var appts7d = await apptQ.CountAsync(a => a.CreatedAt >= d7);
        var appts30d = await apptQ.CountAsync(a => a.CreatedAt >= d30);

        return new AdminOverviewDto(
            totalBusinesses, totalUsers, totalAppointments,
            active, completed, cancelled, totalRevenue,
            newBiz7d, newBiz30d, appts7d, appts30d, revenue30d);
    }

    public async Task<List<AdminBusinessRowDto>> GetBusinessesAsync(DateTime now)
    {
        var d7 = now.AddDays(-7);
        var d30 = now.AddDays(-30);

        var businesses = await _db.Businesses
            .OrderByDescending(b => b.CreatedAt)
            .Select(b => new
            {
                b.Id,
                b.Name,
                b.Slug,
                b.CreatedAt,
                UserCount = _db.UserBusinesses.Count(ub => ub.BusinessId == b.Id),
                TotalAppointments = _db.Appointments.Count(a => a.BusinessId == b.Id),
                Active = _db.Appointments.Count(a => a.BusinessId == b.Id &&
                    (a.Status == AppointmentStatus.Pending || a.Status == AppointmentStatus.Confirmed)),
                Completed = _db.Appointments.Count(a => a.BusinessId == b.Id && a.Status == AppointmentStatus.Completed),
                Cancelled = _db.Appointments.Count(a => a.BusinessId == b.Id && a.Status == AppointmentStatus.Cancelled),
                Last7d = _db.Appointments.Count(a => a.BusinessId == b.Id && a.CreatedAt >= d7),
                Last30d = _db.Appointments.Count(a => a.BusinessId == b.Id && a.CreatedAt >= d30),
                Revenue30d = (decimal?)(
                    from a in _db.Appointments.IgnoreQueryFilters()
                    join s in _db.Services.IgnoreQueryFilters() on a.ServiceId equals s.Id
                    where a.BusinessId == b.Id
                        && a.Status == AppointmentStatus.Completed
                        && a.AppointmentDate >= d30
                    select (decimal?)s.Price ?? 0m
                ).Sum() ?? 0m,
                LastAppointmentAt = (DateTime?)_db.Appointments
                    .Where(a => a.BusinessId == b.Id)
                    .Max(a => (DateTime?)a.AppointmentDate)
            })
            .ToListAsync();

        return businesses.Select(b => new AdminBusinessRowDto(
            b.Id, b.Name, b.Slug, b.CreatedAt,
            b.UserCount, b.TotalAppointments,
            b.Active, b.Completed, b.Cancelled,
            b.Last7d, b.Last30d, b.Revenue30d,
            b.LastAppointmentAt)).ToList();
    }

    public async Task<AdminBusinessDetailDto?> GetBusinessDetailAsync(Guid businessId, DateTime now)
    {
        var biz = await _db.Businesses.FirstOrDefaultAsync(b => b.Id == businessId);
        if (biz == null) return null;

        var d7 = now.AddDays(-7);
        var d30 = now.AddDays(-30);

        var apptQ = _db.Appointments.Where(a => a.BusinessId == businessId);

        var total = await apptQ.CountAsync();
        var active = await apptQ.CountAsync(a => a.Status == AppointmentStatus.Pending || a.Status == AppointmentStatus.Confirmed);
        var completed = await apptQ.CountAsync(a => a.Status == AppointmentStatus.Completed);
        var cancelled = await apptQ.CountAsync(a => a.Status == AppointmentStatus.Cancelled);
        var appts7d = await apptQ.CountAsync(a => a.CreatedAt >= d7);
        var appts30d = await apptQ.CountAsync(a => a.CreatedAt >= d30);
        var lastAt = await apptQ.MaxAsync(a => (DateTime?)a.AppointmentDate);

        var totalRevenue = await (
            from a in _db.Appointments.IgnoreQueryFilters()
            join s in _db.Services.IgnoreQueryFilters() on a.ServiceId equals s.Id
            where a.BusinessId == businessId && a.Status == AppointmentStatus.Completed
            select (decimal?)s.Price ?? 0m
        ).SumAsync();

        var revenue30d = await (
            from a in _db.Appointments.IgnoreQueryFilters()
            join s in _db.Services.IgnoreQueryFilters() on a.ServiceId equals s.Id
            where a.BusinessId == businessId
                && a.Status == AppointmentStatus.Completed
                && a.AppointmentDate >= d30
            select (decimal?)s.Price ?? 0m
        ).SumAsync();

        var serviceCount = await _db.Services.CountAsync(s => s.BusinessId == businessId);
        var blockedCount = await _db.BlockedDates.CountAsync(b => b.BusinessId == businessId);

        var users = await (
            from ub in _db.UserBusinesses
            join u in _db.Users on ub.UserId equals u.Id
            where ub.BusinessId == businessId
            orderby u.CreatedAt
            select new AdminBusinessUserDto(u.Id, u.Email, u.FullName, u.CreatedAt, u.IsSuperAdmin)
        ).ToListAsync();

        var recent = await (
            from a in _db.Appointments
            join s in _db.Services.IgnoreQueryFilters() on a.ServiceId equals s.Id
            where a.BusinessId == businessId
            orderby a.AppointmentDate descending
            select new AdminRecentAppointmentDto(
                a.Id, a.CustomerName, s.Name, a.AppointmentDate, a.Status.ToString())
        ).Take(20).ToListAsync();

        var topServices = await (
            from a in _db.Appointments
            join s in _db.Services.IgnoreQueryFilters() on a.ServiceId equals s.Id
            where a.BusinessId == businessId
            group new { a, s } by new { a.ServiceId, s.Name } into g
            orderby g.Count() descending
            select new AdminServiceUsageDto(
                g.Key.ServiceId,
                g.Key.Name,
                g.Count(),
                g.Where(x => x.a.Status == AppointmentStatus.Completed)
                    .Sum(x => (decimal?)x.s.Price ?? 0m))
        ).Take(10).ToListAsync();

        return new AdminBusinessDetailDto(
            biz.Id, biz.Name, biz.Slug, biz.CreatedAt,
            biz.LogoUrl, biz.BrandColor,
            total, active, completed, cancelled, totalRevenue,
            appts7d, appts30d, revenue30d,
            serviceCount, blockedCount, lastAt,
            users, recent, topServices);
    }

    public async Task<List<AdminActivityItemDto>> GetRecentActivityAsync(int limit)
    {
        var recentAppts = await (
            from a in _db.Appointments
            join b in _db.Businesses on a.BusinessId equals b.Id
            orderby a.CreatedAt descending
            select new AdminActivityItemDto(
                "appointment",
                a.CreatedAt,
                b.Id,
                b.Name,
                a.CustomerName + " — " + a.Status.ToString())
        ).Take(limit).ToListAsync();

        var recentBiz = await _db.Businesses
            .OrderByDescending(b => b.CreatedAt)
            .Take(limit)
            .Select(b => new AdminActivityItemDto(
                "business",
                b.CreatedAt,
                b.Id,
                b.Name,
                "Negocio creado"))
            .ToListAsync();

        return recentAppts
            .Concat(recentBiz)
            .OrderByDescending(x => x.At)
            .Take(limit)
            .ToList();
    }
}
