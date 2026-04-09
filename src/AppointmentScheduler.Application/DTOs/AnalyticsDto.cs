namespace AppointmentScheduler.Application.DTOs;

public record DashboardAnalytics(
    int ActiveAppointments,       // Pending + Confirmed only
    int CompletedAppointments,    // Completed
    int CancelledAppointments,    // Cancelled
    int TodayAppointments,        // active today
    int WeekAppointments,         // active this week
    int MonthAppointments,        // active this month
    int TotalServices,
    decimal MonthRevenue,         // sum of completed service prices this month
    ServiceStat? TopService,
    HourStat? BusiestHour,
    HourStat? QuietestHour);

public record ServiceStat(string Name, int Count);

public record HourStat(int Hour, int Count);
