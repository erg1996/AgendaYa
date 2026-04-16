using AppointmentScheduler.Application.Interfaces;
using AppointmentScheduler.Domain.Entities;
using AppointmentScheduler.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AppointmentScheduler.Infrastructure.Repositories;

public class AppointmentRepository : IAppointmentRepository
{
    private readonly AppDbContext _context;

    public AppointmentRepository(AppDbContext context) => _context = context;

    public async Task<Appointment?> GetByIdAsync(Guid id) =>
        await _context.Appointments.FindAsync(id);

    public async Task<List<Appointment>> GetByBusinessIdAsync(Guid businessId) =>
        await _context.Appointments
            .Where(a => a.BusinessId == businessId)
            .OrderBy(a => a.AppointmentDate)
            .ToListAsync();

    public async Task<(List<Appointment> Items, int Total)> GetPaginatedByBusinessIdAsync(Guid businessId, int page, int pageSize)
    {
        var query = _context.Appointments.Where(a => a.BusinessId == businessId);
        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(a => a.AppointmentDate)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
        return (items, total);
    }

    public async Task<List<Appointment>> GetByBusinessIdAndDateAsync(Guid businessId, DateTime date) =>
        await _context.Appointments
            .Where(a => a.BusinessId == businessId && a.AppointmentDate.Date == date.Date)
            .ToListAsync();

    public async Task<List<Appointment>> GetByBusinessIdAndDateRangeAsync(Guid businessId, DateTime from, DateTime to) =>
        await _context.Appointments
            .Where(a => a.BusinessId == businessId && a.AppointmentDate >= from && a.AppointmentDate < to)
            .OrderBy(a => a.AppointmentDate)
            .ToListAsync();

    // For reminder background service: appointments in [from, to] that haven't been reminded yet
    public async Task<List<Appointment>> GetUpcomingForRemindersAsync(DateTime from, DateTime to) =>
        await _context.Appointments
            .Where(a => a.AppointmentDate >= from
                     && a.AppointmentDate < to
                     && !a.ReminderSent
                     && a.Status != AppointmentStatus.Cancelled
                     && a.CustomerEmail != null)
            .ToListAsync();

    // For WhatsApp reminder dashboard: tomorrow's appointments for a specific business with a phone number
    public async Task<List<Appointment>> GetPendingWhatsAppRemindersByBusinessAsync(Guid businessId, DateTime from, DateTime to) =>
        await _context.Appointments
            .Include(a => a.Business)
            .Include(a => a.Service)
            .Where(a => a.BusinessId == businessId
                     && a.AppointmentDate >= from
                     && a.AppointmentDate < to
                     && !string.IsNullOrEmpty(a.CustomerPhone)
                     && a.Status != AppointmentStatus.Cancelled)
            .OrderBy(a => a.AppointmentDate)
            .ToListAsync();

    public async Task<DashboardAggregates> GetDashboardAggregatesAsync(
        Guid businessId, DateTime today, DateTime weekStart, DateTime weekEnd, DateTime monthStart, DateTime monthEnd)
    {
        var baseQ = _context.Appointments.Where(a => a.BusinessId == businessId);
        var activeQ = baseQ.Where(a => a.Status == AppointmentStatus.Pending || a.Status == AppointmentStatus.Confirmed);

        var activeCount = await activeQ.CountAsync();
        var completedCount = await baseQ.CountAsync(a => a.Status == AppointmentStatus.Completed);
        var cancelledCount = await baseQ.CountAsync(a => a.Status == AppointmentStatus.Cancelled);

        var tomorrow = today.AddDays(1);
        var todayActive = await activeQ.CountAsync(a => a.AppointmentDate >= today && a.AppointmentDate < tomorrow);
        var weekActive = await activeQ.CountAsync(a => a.AppointmentDate >= weekStart && a.AppointmentDate < weekEnd);
        var monthActive = await activeQ.CountAsync(a => a.AppointmentDate >= monthStart && a.AppointmentDate < monthEnd);

        // Pull prices to memory first — SQLite EF provider can't translate Sum on decimal.
        var monthPrices = await (
            from a in _context.Appointments
            join s in _context.Services on a.ServiceId equals s.Id
            where a.BusinessId == businessId
                && a.Status == AppointmentStatus.Completed
                && a.AppointmentDate >= monthStart
                && a.AppointmentDate < monthEnd
            select s.Price
        ).ToListAsync();
        var monthRevenue = monthPrices.Sum(p => p ?? 0m);

        var topService = await activeQ
            .GroupBy(a => a.ServiceId)
            .Select(g => new { ServiceId = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count)
            .FirstOrDefaultAsync();

        var hourStats = await activeQ
            .GroupBy(a => a.AppointmentDate.Hour)
            .Select(g => new { Hour = g.Key, Count = g.Count() })
            .ToListAsync();

        var busiest = hourStats.OrderByDescending(h => h.Count).FirstOrDefault();
        var quietest = hourStats.OrderBy(h => h.Count).FirstOrDefault();

        return new DashboardAggregates(
            activeCount, completedCount, cancelledCount,
            todayActive, weekActive, monthActive,
            monthRevenue,
            topService?.ServiceId, topService?.Count ?? 0,
            busiest?.Hour, busiest?.Count ?? 0,
            quietest?.Hour, quietest?.Count ?? 0);
    }

    public async Task AddAsync(Appointment appointment) =>
        await _context.Appointments.AddAsync(appointment);

    // Atomic: serializable transaction that re-checks for overlap after acquiring
    // a write lock, then inserts. Returns false if a concurrent appointment now
    // conflicts (caller should translate to ConflictException).
    public async Task<bool> TryCreateWithOverlapCheckAsync(Appointment appointment)
    {
        await using var tx = await _context.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable);

        var newStart = appointment.AppointmentDate;
        var newEnd = newStart.AddMinutes(appointment.DurationMinutes);
        var dayStart = newStart.Date;
        var dayEnd = dayStart.AddDays(1);

        var conflict = await _context.Appointments
            .Where(a => a.BusinessId == appointment.BusinessId
                     && a.Status != AppointmentStatus.Cancelled
                     && a.AppointmentDate >= dayStart
                     && a.AppointmentDate < dayEnd)
            .AnyAsync(a => newStart < a.AppointmentDate.AddMinutes(a.DurationMinutes)
                        && a.AppointmentDate < newEnd);

        if (conflict)
        {
            await tx.RollbackAsync();
            return false;
        }

        await _context.Appointments.AddAsync(appointment);
        await _context.SaveChangesAsync();
        await tx.CommitAsync();
        return true;
    }

    // Atomic claim of reminder send rights. Returns true if this caller claimed
    // it (should send); false if another process already did.
    public async Task<bool> ClaimReminderAsync(Guid appointmentId)
    {
        var affected = await _context.Appointments
            .Where(a => a.Id == appointmentId && !a.ReminderSent)
            .ExecuteUpdateAsync(u => u.SetProperty(a => a.ReminderSent, true));
        return affected == 1;
    }

    public async Task SaveChangesAsync() =>
        await _context.SaveChangesAsync();
}
