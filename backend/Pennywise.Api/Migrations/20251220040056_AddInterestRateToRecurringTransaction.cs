using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pennywise.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddInterestRateToRecurringTransaction : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "InterestRate",
                table: "RecurringTransactions",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsCompounding",
                table: "RecurringTransactions",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "InterestRate",
                table: "RecurringTransactions");

            migrationBuilder.DropColumn(
                name: "IsCompounding",
                table: "RecurringTransactions");
        }
    }
}
