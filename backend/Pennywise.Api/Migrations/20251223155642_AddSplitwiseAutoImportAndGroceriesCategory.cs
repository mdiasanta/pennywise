using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Pennywise.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddSplitwiseAutoImportAndGroceriesCategory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Expenses_UserId",
                table: "Expenses");

            migrationBuilder.AddColumn<string>(
                name: "ExternalSourceId",
                table: "Expenses",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "SplitwiseAutoImports",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    GroupId = table.Column<long>(type: "bigint", nullable: false),
                    GroupName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    SplitwiseUserId = table.Column<long>(type: "bigint", nullable: false),
                    SplitwiseMemberName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    StartDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Frequency = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    LastRunAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    NextRunAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastRunImportedCount = table.Column<int>(type: "integer", nullable: false),
                    LastRunError = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SplitwiseAutoImports", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SplitwiseAutoImports_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            // Update Food & Dining description (resilient to existing values)
            migrationBuilder.Sql(
                "UPDATE \"Categories\" SET \"Description\" = 'Restaurants and dining out' " +
                "WHERE \"Id\" = 1 AND \"Name\" = 'Food & Dining' AND \"UserId\" IS NULL;"
            );

            // Add Groceries category (resilient if it already exists)
            migrationBuilder.Sql(
                "INSERT INTO \"Categories\" (\"Id\", \"Color\", \"CreatedAt\", \"Description\", \"Name\", \"UpdatedAt\", \"UserId\") " +
                "VALUES (10, '#2ECC71', TIMESTAMPTZ '2025-01-01 00:00:00+00', 'Grocery shopping and supermarket purchases', 'Groceries', TIMESTAMPTZ '2025-01-01 00:00:00+00', NULL) " +
                "ON CONFLICT (\"Id\") DO NOTHING;"
            );

            migrationBuilder.CreateIndex(
                name: "IX_Expenses_UserId_ExternalSourceId",
                table: "Expenses",
                columns: new[] { "UserId", "ExternalSourceId" });

            migrationBuilder.CreateIndex(
                name: "IX_SplitwiseAutoImports_IsActive",
                table: "SplitwiseAutoImports",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_SplitwiseAutoImports_NextRunAt",
                table: "SplitwiseAutoImports",
                column: "NextRunAt");

            migrationBuilder.CreateIndex(
                name: "IX_SplitwiseAutoImports_UserId_GroupId_SplitwiseUserId",
                table: "SplitwiseAutoImports",
                columns: new[] { "UserId", "GroupId", "SplitwiseUserId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SplitwiseAutoImports");

            migrationBuilder.DropIndex(
                name: "IX_Expenses_UserId_ExternalSourceId",
                table: "Expenses");

            // Only delete the seeded Groceries category
            migrationBuilder.Sql(
                "DELETE FROM \"Categories\" WHERE \"Id\" = 10 AND \"Name\" = 'Groceries' AND \"UserId\" IS NULL;"
            );

            migrationBuilder.DropColumn(
                name: "ExternalSourceId",
                table: "Expenses");

            // Restore original Food & Dining description
            migrationBuilder.Sql(
                "UPDATE \"Categories\" SET \"Description\" = 'Groceries, restaurants, and dining out' " +
                "WHERE \"Id\" = 1 AND \"Name\" = 'Food & Dining' AND \"UserId\" IS NULL;"
            );

            migrationBuilder.CreateIndex(
                name: "IX_Expenses_UserId",
                table: "Expenses",
                column: "UserId");
        }
    }
}
