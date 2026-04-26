using AppointmentScheduler.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace AppointmentScheduler.Infrastructure.Data;

public class AppDbContext : DbContext
{
    // Npgsql 8 removed the legacy timestamp AppContext switch and now always
    // returns DateTimeKind.Utc from timestamptz columns. This converter makes
    // EF Core transparently treat all DateTime values as UTC when reading/writing,
    // so: (1) writes of Kind.Unspecified succeed, (2) LINQ query parameters are
    // sent as UTC, and (3) reads return Unspecified — combined with
    // NaiveDateTimeConverter the API never emits a Z suffix.
    private static readonly ValueConverter<DateTime, DateTime> _utcConverter = new(
        v => v.Kind == DateTimeKind.Utc ? v : DateTime.SpecifyKind(v, DateTimeKind.Utc),
        v => DateTime.SpecifyKind(v, DateTimeKind.Unspecified));

    private static readonly ValueConverter<DateTime?, DateTime?> _utcConverterNullable = new(
        v => v == null ? null : v.Value.Kind == DateTimeKind.Utc ? v : DateTime.SpecifyKind(v.Value, DateTimeKind.Utc),
        v => v == null ? null : DateTime.SpecifyKind(v.Value, DateTimeKind.Unspecified));

    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Business> Businesses => Set<Business>();
    public DbSet<Service> Services => Set<Service>();
    public DbSet<Appointment> Appointments => Set<Appointment>();
    public DbSet<WorkingHours> WorkingHours => Set<WorkingHours>();
    public DbSet<BlockedDate> BlockedDates => Set<BlockedDate>();
    public DbSet<User> Users => Set<User>();
    public DbSet<UserBusiness> UserBusinesses => Set<UserBusiness>();
    public DbSet<WhatsAppMessageTemplate> WhatsAppMessageTemplates => Set<WhatsAppMessageTemplate>();
    public DbSet<WhatsAppSession> WhatsAppSessions => Set<WhatsAppSession>();
    public DbSet<WhatsAppBlacklist> WhatsAppBlacklists => Set<WhatsAppBlacklist>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Business>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Slug).IsRequired().HasMaxLength(200);
            entity.Property(e => e.LogoUrl).HasMaxLength(500);
            entity.Property(e => e.BrandColor).HasMaxLength(20);
            entity.Property(e => e.WhatsAppReminderTemplate).HasMaxLength(2000);
            entity.Property(e => e.Address).HasMaxLength(500);
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
            entity.Property(e => e.WhatsAppReminderSent).HasDefaultValue(false);
            entity.Property(e => e.WhatsAppReminderFailed).HasDefaultValue(false);
            entity.Property(e => e.WhatsAppOptIn).HasDefaultValue(false);
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
            entity.Property(e => e.IsSuperAdmin).HasDefaultValue(false);
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

        modelBuilder.Entity<WhatsAppMessageTemplate>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Body).IsRequired();
            entity.HasOne(e => e.Business)
                .WithMany()
                .HasForeignKey(e => e.BusinessId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<WhatsAppBlacklist>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.NormalizedPhone).IsRequired().HasMaxLength(30);
            entity.HasIndex(e => new { e.BusinessId, e.NormalizedPhone }).IsUnique();
            entity.HasOne(e => e.Business)
                .WithMany()
                .HasForeignKey(e => e.BusinessId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<WhatsAppSession>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Status).HasConversion<int>().HasDefaultValue(WhatsAppSessionStatus.Disconnected);
            entity.Property(e => e.PhoneNumber).HasMaxLength(30);
            entity.Property(e => e.LastError).HasMaxLength(500);
            entity.Property(e => e.AutoRemindersEnabled).HasDefaultValue(false);
            entity.Property(e => e.TimeZoneId).HasMaxLength(100);
            entity.HasIndex(e => e.BusinessId).IsUnique();
            entity.HasOne(e => e.Business)
                .WithMany()
                .HasForeignKey(e => e.BusinessId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Apply UTC converter to every DateTime/DateTime? property so Npgsql 8
        // accepts all writes and EF Core sends UTC parameters in LINQ queries.
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            foreach (var property in entityType.GetProperties())
            {
                if (property.ClrType == typeof(DateTime))
                    property.SetValueConverter(_utcConverter);
                else if (property.ClrType == typeof(DateTime?))
                    property.SetValueConverter(_utcConverterNullable);
            }
        }
    }
}
