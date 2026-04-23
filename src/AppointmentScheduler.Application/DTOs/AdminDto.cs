namespace AppointmentScheduler.Application.DTOs;

public record AdminOverviewDto(
    int TotalBusinesses,
    int TotalUsers,
    int TotalAppointments,
    int ActiveAppointments,
    int CompletedAppointments,
    int CancelledAppointments,
    decimal TotalRevenue,
    int NewBusinesses7d,
    int NewBusinesses30d,
    int Appointments7d,
    int Appointments30d,
    decimal Revenue30d);

public record AdminBusinessRowDto(
    Guid Id,
    string Name,
    string Slug,
    DateTime CreatedAt,
    int UserCount,
    int TotalAppointments,
    int Active,
    int Completed,
    int Cancelled,
    int Last7dAppointments,
    int Last30dAppointments,
    decimal Revenue30d,
    DateTime? LastAppointmentAt);

public record AdminBusinessUserDto(
    Guid Id,
    string Email,
    string FullName,
    DateTime CreatedAt,
    bool IsSuperAdmin);

public record AdminRecentAppointmentDto(
    Guid Id,
    string CustomerName,
    string ServiceName,
    DateTime AppointmentDate,
    string Status);

public record AdminServiceUsageDto(
    Guid ServiceId,
    string ServiceName,
    int Count,
    decimal Revenue);

public record AdminBusinessDetailDto(
    Guid Id,
    string Name,
    string Slug,
    DateTime CreatedAt,
    string? LogoUrl,
    string? BrandColor,
    int TotalAppointments,
    int Active,
    int Completed,
    int Cancelled,
    decimal TotalRevenue,
    int Appointments7d,
    int Appointments30d,
    decimal Revenue30d,
    int ServiceCount,
    int BlockedDateCount,
    DateTime? LastAppointmentAt,
    List<AdminBusinessUserDto> Users,
    List<AdminRecentAppointmentDto> RecentAppointments,
    List<AdminServiceUsageDto> TopServices);

public record AdminActivityItemDto(
    string Type,
    DateTime At,
    Guid BusinessId,
    string BusinessName,
    string Summary);
