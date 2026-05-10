using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AppointmentScheduler.Infrastructure.Migrations;

public partial class AddMultiEmployee : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // ── 1. Create Employees table ─────────────────────────────────────────
        migrationBuilder.CreateTable(
            name: "Employees",
            columns: table => new
            {
                Id = table.Column<Guid>(nullable: false),
                BusinessId = table.Column<Guid>(nullable: false),
                Name = table.Column<string>(maxLength: 200, nullable: false),
                Color = table.Column<string>(maxLength: 20, nullable: false, defaultValue: "#6366f1"),
                AvatarUrl = table.Column<string>(maxLength: 500, nullable: true),
                IsActive = table.Column<bool>(nullable: false, defaultValue: true),
                DisplayOrder = table.Column<int>(nullable: false, defaultValue: 0),
                CommissionPercent = table.Column<decimal>(type: "decimal(5,2)", nullable: false, defaultValue: 100m),
                UserId = table.Column<Guid>(nullable: true),
                CreatedAt = table.Column<DateTime>(nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Employees", x => x.Id);
                table.ForeignKey("FK_Employees_Businesses_BusinessId",
                    x => x.BusinessId, "Businesses", "Id", onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex("IX_Employees_BusinessId", "Employees", "BusinessId");

        // ── 2. Create EmployeeServiceLinks table ──────────────────────────────
        migrationBuilder.CreateTable(
            name: "EmployeeServiceLinks",
            columns: table => new
            {
                EmployeeId = table.Column<Guid>(nullable: false),
                ServiceId = table.Column<Guid>(nullable: false),
                OverridePrice = table.Column<decimal>(type: "decimal(10,2)", nullable: true),
                OverrideDurationMinutes = table.Column<int>(nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_EmployeeServiceLinks", x => new { x.EmployeeId, x.ServiceId });
                table.ForeignKey("FK_EmployeeServiceLinks_Employees_EmployeeId",
                    x => x.EmployeeId, "Employees", "Id", onDelete: ReferentialAction.Cascade);
                table.ForeignKey("FK_EmployeeServiceLinks_Services_ServiceId",
                    x => x.ServiceId, "Services", "Id", onDelete: ReferentialAction.Cascade);
            });

        // ── 3. Add EmployeeId (nullable) to WorkingHours and Appointments ─────
        migrationBuilder.AddColumn<Guid>("EmployeeId", "WorkingHours", nullable: true);
        migrationBuilder.AddColumn<Guid>("EmployeeId", "Appointments", nullable: true);

        // ── 4. Backfill: create one default Employee per Business ─────────────
        //    Then link WorkingHours, Appointments, and EmployeeServiceLinks.
        migrationBuilder.Sql(@"
            -- Insert one default employee per business using the business's brand color.
            INSERT INTO ""Employees"" (""Id"", ""BusinessId"", ""Name"", ""Color"", ""IsActive"", ""DisplayOrder"", ""CommissionPercent"", ""CreatedAt"")
            SELECT
                gen_random_uuid(),
                b.""Id"",
                'Principal',
                COALESCE(b.""BrandColor"", '#6366f1'),
                true,
                0,
                100,
                NOW()
            FROM ""Businesses"" b;

            -- Point existing WorkingHours at the new default employee.
            UPDATE ""WorkingHours"" wh
            SET ""EmployeeId"" = e.""Id""
            FROM ""Employees"" e
            WHERE e.""BusinessId"" = wh.""BusinessId"";

            -- Point existing Appointments at the new default employee.
            UPDATE ""Appointments"" a
            SET ""EmployeeId"" = e.""Id""
            FROM ""Employees"" e
            WHERE e.""BusinessId"" = a.""BusinessId"";

            -- Link default employee to all services of their business.
            INSERT INTO ""EmployeeServiceLinks"" (""EmployeeId"", ""ServiceId"")
            SELECT e.""Id"", s.""Id""
            FROM ""Employees"" e
            JOIN ""Services"" s ON s.""BusinessId"" = e.""BusinessId""
            WHERE s.""IsDeleted"" = false;
        ");

        // ── 5. Constrain EmployeeId NOT NULL ─────────────────────────────────
        migrationBuilder.AlterColumn<Guid>("EmployeeId", "WorkingHours", nullable: false, oldClrType: typeof(Guid), oldNullable: true);
        migrationBuilder.AlterColumn<Guid>("EmployeeId", "Appointments", nullable: false, oldClrType: typeof(Guid), oldNullable: true);

        // ── 6. Add FKs for EmployeeId ─────────────────────────────────────────
        migrationBuilder.AddForeignKey("FK_WorkingHours_Employees_EmployeeId",
            "WorkingHours", "EmployeeId", "Employees", principalColumn: "Id", onDelete: ReferentialAction.Cascade);

        migrationBuilder.AddForeignKey("FK_Appointments_Employees_EmployeeId",
            "Appointments", "EmployeeId", "Employees", principalColumn: "Id", onDelete: ReferentialAction.Restrict);

        // ── 7. Add index on Appointments(EmployeeId, AppointmentDate) ──────────
        migrationBuilder.CreateIndex("IX_Appointments_EmployeeId_AppointmentDate",
            "Appointments", new[] { "EmployeeId", "AppointmentDate" });

        // ── 8. Drop old WorkingHours(BusinessId, DayOfWeek) unique index and FK ─
        migrationBuilder.DropIndex("IX_WorkingHours_BusinessId_DayOfWeek", "WorkingHours");
        migrationBuilder.DropForeignKey("FK_WorkingHours_Businesses_BusinessId", "WorkingHours");
        migrationBuilder.DropColumn("BusinessId", "WorkingHours");

        // ── 9. Add new (EmployeeId, DayOfWeek) index (not unique — split shifts) ─
        migrationBuilder.CreateIndex("IX_WorkingHours_EmployeeId_DayOfWeek",
            "WorkingHours", new[] { "EmployeeId", "DayOfWeek" });
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable("EmployeeServiceLinks");
        migrationBuilder.DropIndex("IX_WorkingHours_EmployeeId_DayOfWeek", "WorkingHours");
        migrationBuilder.DropForeignKey("FK_Appointments_Employees_EmployeeId", "Appointments");
        migrationBuilder.DropForeignKey("FK_WorkingHours_Employees_EmployeeId", "WorkingHours");
        migrationBuilder.DropIndex("IX_Appointments_EmployeeId_AppointmentDate", "Appointments");
        migrationBuilder.DropColumn("EmployeeId", "Appointments");
        migrationBuilder.DropColumn("EmployeeId", "WorkingHours");
        migrationBuilder.DropTable("Employees");
    }
}
