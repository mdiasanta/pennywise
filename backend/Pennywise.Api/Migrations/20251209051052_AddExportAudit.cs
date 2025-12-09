using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Pennywise.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddExportAudit : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ExportAudits",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    Timestamp = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    Format = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    FilterParams = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    RowCount = table.Column<int>(type: "integer", nullable: true),
                    ClientIp = table.Column<string>(type: "character varying(45)", maxLength: 45, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExportAudits", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ExportAudits_Timestamp",
                table: "ExportAudits",
                column: "Timestamp");

            migrationBuilder.CreateIndex(
                name: "IX_ExportAudits_UserId",
                table: "ExportAudits",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ExportAudits");
        }
    }
}
