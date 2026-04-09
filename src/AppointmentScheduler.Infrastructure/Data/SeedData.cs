namespace AppointmentScheduler.Infrastructure.Data;

public static class SeedData
{
    public static Task SeedAsync(AppDbContext context)
    {
        // No seed data — each user creates their own business on registration
        return Task.CompletedTask;
    }
}
