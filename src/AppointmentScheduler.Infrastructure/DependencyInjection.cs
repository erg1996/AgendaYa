using AppointmentScheduler.Application.Interfaces;
using AppointmentScheduler.Application.Services;
using AppointmentScheduler.Infrastructure.Data;
using AppointmentScheduler.Infrastructure.Repositories;
using AppointmentScheduler.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace AppointmentScheduler.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<AppDbContext>(options =>
            options.UseSqlite(configuration.GetConnectionString("DefaultConnection")));

        // Repositories
        services.AddScoped<IBusinessRepository, BusinessRepository>();
        services.AddScoped<IServiceRepository, ServiceRepository>();
        services.AddScoped<IAppointmentRepository, AppointmentRepository>();
        services.AddScoped<IWorkingHoursRepository, WorkingHoursRepository>();
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IBlockedDateRepository, BlockedDateRepository>();
        services.AddScoped<IUserBusinessRepository, UserBusinessRepository>();

        // Application services
        services.AddScoped<BusinessService>();
        services.AddScoped<ServiceService>();
        services.AddScoped<WorkingHoursService>();
        services.AddScoped<AvailabilityService>();
        services.AddScoped<AppointmentService>();
        services.AddScoped<AnalyticsService>();
        services.AddScoped<BlockedDateService>();
        services.AddScoped<IEmailService, SmtpEmailService>();
        services.AddScoped<AuthService>(sp =>
        {
            var userRepo = sp.GetRequiredService<IUserRepository>();
            var bizRepo = sp.GetRequiredService<IBusinessRepository>();
            var userBizRepo = sp.GetRequiredService<IUserBusinessRepository>();
            var jwtSecret = configuration["Jwt:Secret"] ?? "DEV-ONLY-SECRET-KEY-CHANGE-IN-PRODUCTION-Min32Chars!!";
            return new AuthService(userRepo, bizRepo, userBizRepo, jwtSecret);
        });

        return services;
    }
}
