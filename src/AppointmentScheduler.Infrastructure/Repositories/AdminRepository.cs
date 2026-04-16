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

        // SQLite EF provider can't Sum decimal columns — pull prices to memory
        var completedPrices = await (
            from a in _db.Appointments.IgnoreQueryFilters()
            join s in _db.Services.IgnoreQueryFilters() on a.ServiceId equals s.Id
            where a.Status == AppointmentStatus.Completed
            select new { Price = s.Price ?? 0m, a.AppointmentDate }
        ).ToListAsync();

        var totalRevenue = completedPrices.Sum(x => x.Price);
        var revenue30d = completedPrices.Where(x => x.AppointmentDate >= d30).Sum(x => x.Price);

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
                LastAppointmentAt = (DateTime?)_db.Appointments
                    .Where(a => a.BusinessId == b.Id)
                    .Max(a => (DateTime?)a.AppointmentDate)
            })
            .ToListAsync();

        // SQLite EF provider can't Sum decimal — pull to memory and sum there
        var rev30dRows = await (
            from a in _db.Appointments.IgnoreQueryFilters()
            join s in _db.Services.IgnoreQueryFilters() on a.ServiceId equals s.Id
            where a.Status == AppointmentStatus.Completed && a.AppointmentDate >= d30
            select new { a.BusinessId, Price = s.Price ?? 0m }
        ).ToListAsync();

        var revenue30dByBiz = rev30dRows
            .GroupBy(x => x.BusinessId)
            .ToDictionary(g => g.Key, g => g.Sum(x => x.Price));

        return businesses.Select(b => new AdminBusinessRowDto(
            b.Id, b.Name, b.Slug, b.CreatedAt,
            b.UserCount, b.TotalAppointments,
            b.Active, b.Completed, b.Cancelled,
            b.Last7d, b.Last30d,
            revenue30dByBiz.GetValueOrDefault(b.Id, 0m),
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

        // SQLite EF provider can't Sum decimal — pull to memory
        var bizCompletedPrices = await (
            from a in _db.Appointments.IgnoreQueryFilters()
            join s in _db.Services.IgnoreQueryFilters() on a.ServiceId equals s.Id
            where a.BusinessId == businessId && a.Status == AppointmentStatus.Completed
            select new { Price = s.Price ?? 0m, a.AppointmentDate }
        ).ToListAsync();

        var totalRevenue = bizCompletedPrices.Sum(x => x.Price);
        var revenue30d = bizCompletedPrices.Where(x => x.AppointmentDate >= d30).Sum(x => x.Price);

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

        // Load service usage counts in memory to avoid complex EF translation
        var serviceUsageRaw = await (
            from a in _db.Appointments.IgnoreQueryFilters()
            join s in _db.Services.IgnoreQueryFilters() on a.ServiceId equals s.Id
            where a.BusinessId == businessId
            select new { a.ServiceId, s.Name, a.Status, Price = s.Price ?? 0m }
        ).ToListAsync();

        var topServices = serviceUsageRaw
            .GroupBy(x => new { x.ServiceId, x.Name })
            .OrderByDescending(g => g.Count())
            .Take(10)
            .Select(g => new AdminServiceUsageDto(
                g.Key.ServiceId,
                g.Key.Name,
                g.Count(),
                g.Where(x => x.Status == AppointmentStatus.Completed).Sum(x => x.Price)))
            .ToList();

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
