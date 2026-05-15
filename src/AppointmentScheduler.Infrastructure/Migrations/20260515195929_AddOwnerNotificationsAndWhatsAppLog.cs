using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AppointmentScheduler.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddOwnerNotificationsAndWhatsAppLog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ── 1. Create WhatsAppLogs table ──────────────────────────────────────
            migrationBuilder.CreateTable(
                name: "WhatsAppLogs",
                columns: table => new
                {
                    Id            = table.Column<Guid>(type: "uuid", nullable: false),
                    BusinessId    = table.Column<Guid>(type: "uuid", nullable: false),
                    AppointmentId = table.Column<Guid>(type: "uuid", nullable: true),
                    SenderPhone   = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    RecipientPhone = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    RecipientName  = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    MessageType   = table.Column<int>(type: "integer", nullable: false),
                    Success       = table.Column<bool>(type: "boolean", nullable: false),
                    ErrorReason   = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    SentAt        = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WhatsAppLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WhatsAppLogs_Businesses_BusinessId",
                        column: x => x.BusinessId,
                        principalTable: "Businesses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_WhatsAppLogs_BusinessId_SentAt",
                table: "WhatsAppLogs",
                columns: new[] { "BusinessId", "SentAt" });

            // ── 2. Add owner notification settings to Businesses ──────────────────
            migrationBuilder.AddColumn<bool>(
                name: "OwnerNotifyEmail",
                table: "Businesses",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<string>(
                name: "OwnerNotifyPhone",
                table: "Businesses",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "OwnerNotifyWhatsApp",
                table: "Businesses",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "WhatsAppLogs");

            migrationBuilder.DropColumn(name: "OwnerNotifyEmail",   table: "Businesses");
            migrationBuilder.DropColumn(name: "OwnerNotifyPhone",   table: "Businesses");
            migrationBuilder.DropColumn(name: "OwnerNotifyWhatsApp", table: "Businesses");
        }
    }
}
