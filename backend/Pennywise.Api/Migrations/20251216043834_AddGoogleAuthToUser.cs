using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pennywise.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddGoogleAuthToUser : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "GoogleSubjectId",
                table: "Users",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PictureUrl",
                table: "Users",
                type: "character varying(2048)",
                maxLength: 2048,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_GoogleSubjectId",
                table: "Users",
                column: "GoogleSubjectId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Users_GoogleSubjectId",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "GoogleSubjectId",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "PictureUrl",
                table: "Users");
        }
    }
}
