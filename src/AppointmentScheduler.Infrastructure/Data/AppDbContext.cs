using AppointmentScheduler.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace AppointmentScheduler.Infrastructure.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Business> Businesses => Set<Business>();
    public DbSet<Service> Services => Set<Service>();
    public DbSet<Appointment> Appointments => Set<Appointment>();
    public DbSet<WorkingHours> WorkingHours => Set<WorkingHours>();
    public DbSet<BlockedDate> BlockedDates => Set<BlockedDate>();
    public DbSet<User> Users => Set<User>();
    public DbSet<UserBusiness> UserBusinesses => Set<UserBusiness>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Business>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Slug).IsRequired().HasMaxLength(200);
            entity.Property(e => e.LogoUrl).HasMaxLength(500);
            entity.Property(e => e.BrandColor).HasMaxLength(20);
            entity.HasIndex(e => e.Slug).IsUnique();
        });

        modelBuilder.Entity<Service>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Price).HasColumnType("decimal(10,2)");
            entity.HasIndex(e => e.BusinessId);
            // Global query filter: soft delete
            entity.HasQueryFilter(e => !e.IsDeleted);
            entity.HasOne(e => e.Business)
                .WithMany(b => b.Services)
                .HasForeignKey(e => e.BusinessId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Appointment>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.CustomerName).IsRequired().HasMaxLength(200);
            entity.Property(e => e.CustomerEmail).HasMaxLength(200);
            entity.Property(e => e.CustomerPhone).HasMaxLength(30);
            entity.Property(e => e.Status).HasConversion<int>().HasDefaultValue(AppointmentStatus.Pending);
            entity.Property(e => e.Notes).HasMaxLength(1000);
            entity.Property(e => e.ReminderSent).HasDefaultValue(false);
            entity.Ignore(e => e.EndTime);
            entity.HasIndex(e => new { e.BusinessId, e.AppointmentDate });
            entity.HasIndex(e => e.ServiceId);
            entity.HasOne(e => e.Business)
                .WithMany(b => b.Appointments)
                .HasForeignKey(e => e.BusinessId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Service)
                .WithMany()
                .HasForeignKey(e => e.ServiceId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<WorkingHours>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.BusinessId, e.DayOfWeek }).IsUnique();
            entity.HasOne(e => e.Business)
                .WithMany(b => b.WorkingHours)
                .HasForeignKey(e => e.BusinessId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<BlockedDate>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Reason).HasMaxLength(500);
            entity.HasIndex(e => new { e.BusinessId, e.Date }).IsUnique();
            entity.HasOne(e => e.Business)
                .WithMany(b => b.BlockedDates)
                .HasForeignKey(e => e.BusinessId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Email).IsRequired().HasMaxLength(200);
            entity.HasIndex(e => e.Email).IsUnique();
            entity.Property(e => e.PasswordHash).IsRequired();
            entity.Property(e => e.FullName).IsRequired().HasMaxLength(200);
            entity.HasOne(e => e.Business)
                .WithMany()
                .HasForeignKey(e => e.BusinessId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<UserBusiness>(entity =>
        {
            entity.HasKey(e => new { e.UserId, e.BusinessId });
            entity.HasIndex(e => e.BusinessId);
            entity.HasOne(e => e.User)
                .WithMany(u => u.UserBusinesses)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Business)
                .WithMany(b => b.UserBusinesses)
                .HasForeignKey(e => e.BusinessId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
