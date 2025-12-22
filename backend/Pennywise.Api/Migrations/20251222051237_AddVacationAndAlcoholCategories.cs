using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Pennywise.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddVacationAndAlcoholCategories : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Make this migration resilient if these seeded rows already exist.
            // We use ON CONFLICT (Id) DO NOTHING because Id is the primary key.
            migrationBuilder.Sql(
                "INSERT INTO \"Categories\" (\"Id\", \"Color\", \"CreatedAt\", \"Description\", \"Name\", \"UpdatedAt\", \"UserId\") " +
                "VALUES (8, '#11ff00', TIMESTAMPTZ '2025-01-01 00:00:00+00', 'Travel, lodging, and vacations', 'Vacation', TIMESTAMPTZ '2025-01-01 00:00:00+00', NULL) " +
                "ON CONFLICT (\"Id\") DO NOTHING;"
            );

            migrationBuilder.Sql(
                "INSERT INTO \"Categories\" (\"Id\", \"Color\", \"CreatedAt\", \"Description\", \"Name\", \"UpdatedAt\", \"UserId\") " +
                "VALUES (9, '#ff0026', TIMESTAMPTZ '2025-01-01 00:00:00+00', 'Alcoholic beverages and bar tabs', 'Alcohol', TIMESTAMPTZ '2025-01-01 00:00:00+00', NULL) " +
                "ON CONFLICT (\"Id\") DO NOTHING;"
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Only delete the seeded defaults (global categories), not any user-owned categories.
            migrationBuilder.Sql(
                "DELETE FROM \"Categories\" WHERE \"Id\" = 8 AND \"Name\" = 'Vacation' AND \"UserId\" IS NULL;"
            );

            migrationBuilder.Sql(
                "DELETE FROM \"Categories\" WHERE \"Id\" = 9 AND \"Name\" = 'Alcohol' AND \"UserId\" IS NULL;"
            );
        }
    }
}
