using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Pennywise.Api.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Categories",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Color = table.Column<string>(type: "character varying(7)", maxLength: 7, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Categories", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Username = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Expenses",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    Amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    CategoryId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Expenses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Expenses_Categories_CategoryId",
                        column: x => x.CategoryId,
                        principalTable: "Categories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Expenses_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "Categories",
                columns: new[] { "Id", "Color", "CreatedAt", "Description", "Name", "UpdatedAt" },
                values: new object[,]
                {
                    { 1, "#FF6B6B", new DateTime(2025, 12, 8, 7, 23, 6, 817, DateTimeKind.Utc).AddTicks(6656), "Groceries, restaurants, and dining out", "Food & Dining", new DateTime(2025, 12, 8, 7, 23, 6, 817, DateTimeKind.Utc).AddTicks(6893) },
                    { 2, "#4ECDC4", new DateTime(2025, 12, 8, 7, 23, 6, 817, DateTimeKind.Utc).AddTicks(7281), "Gas, public transport, car maintenance", "Transportation", new DateTime(2025, 12, 8, 7, 23, 6, 817, DateTimeKind.Utc).AddTicks(7282) },
                    { 3, "#45B7D1", new DateTime(2025, 12, 8, 7, 23, 6, 817, DateTimeKind.Utc).AddTicks(7284), "Clothing, electronics, and general shopping", "Shopping", new DateTime(2025, 12, 8, 7, 23, 6, 817, DateTimeKind.Utc).AddTicks(7284) },
                    { 4, "#FFA07A", new DateTime(2025, 12, 8, 7, 23, 6, 817, DateTimeKind.Utc).AddTicks(7286), "Movies, games, hobbies, and recreation", "Entertainment", new DateTime(2025, 12, 8, 7, 23, 6, 817, DateTimeKind.Utc).AddTicks(7287) },
                    { 5, "#98D8C8", new DateTime(2025, 12, 8, 7, 23, 6, 817, DateTimeKind.Utc).AddTicks(7288), "Rent, electricity, water, internet", "Bills & Utilities", new DateTime(2025, 12, 8, 7, 23, 6, 817, DateTimeKind.Utc).AddTicks(7288) },
                    { 6, "#F7DC6F", new DateTime(2025, 12, 8, 7, 23, 6, 817, DateTimeKind.Utc).AddTicks(7290), "Medical expenses, pharmacy, insurance", "Healthcare", new DateTime(2025, 12, 8, 7, 23, 6, 817, DateTimeKind.Utc).AddTicks(7290) },
                    { 7, "#B19CD9", new DateTime(2025, 12, 8, 7, 23, 6, 817, DateTimeKind.Utc).AddTicks(7291), "Miscellaneous expenses", "Other", new DateTime(2025, 12, 8, 7, 23, 6, 817, DateTimeKind.Utc).AddTicks(7292) }
                });

            migrationBuilder.CreateIndex(
                name: "IX_Expenses_CategoryId",
                table: "Expenses",
                column: "CategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_Expenses_UserId",
                table: "Expenses",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Users_Email",
                table: "Users",
                column: "Email",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Expenses");

            migrationBuilder.DropTable(
                name: "Categories");

            migrationBuilder.DropTable(
                name: "Users");
        }
    }
}
