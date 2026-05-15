using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AppointmentScheduler.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddWhatsAppPhase4 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "FirstConnectedAt",
                table: "WhatsAppSessions",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TimeZoneId",
                table: "WhatsAppSessions",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "WhatsAppOptIn",
                table: "Appointments",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "WhatsAppReminderFailed",
                table: "Appointments",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "WhatsAppBlacklists",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BusinessId = table.Column<Guid>(type: "uuid", nullable: false),
                    NormalizedPhone = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WhatsAppBlacklists", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WhatsAppBlacklists_Businesses_BusinessId",
                        column: x => x.BusinessId,
                        principalTable: "Businesses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_WhatsAppBlacklists_BusinessId_NormalizedPhone",
                table: "WhatsAppBlacklists",
                columns: new[] { "BusinessId", "NormalizedPhone" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "WhatsAppBlacklists");

            migrationBuilder.DropColumn(
                name: "FirstConnectedAt",
                table: "WhatsAppSessions");

            migrationBuilder.DropColumn(
                name: "TimeZoneId",
                table: "WhatsAppSessions");

            migrationBuilder.DropColumn(
                name: "WhatsAppOptIn",
                table: "Appointments");

            migrationBuilder.DropColumn(
                name: "WhatsAppReminderFailed",
                table: "Appointments");
        }
    }
}
