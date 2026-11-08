using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RaceShop.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Cars",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CarNumber = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    Team = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ChassisId = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Cars", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Parts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PartNumber = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Category = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: false),
                    Manufacturer = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Cost = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: false),
                    LifeLimitUnit = table.Column<string>(type: "nvarchar(8)", maxLength: 8, nullable: false),
                    LifeLimitValue = table.Column<decimal>(type: "decimal(10,1)", precision: 10, scale: 1, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Parts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SerializedParts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SerialNumber = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: false),
                    PartId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AccumulatedUsage = table.Column<decimal>(type: "decimal(10,1)", precision: 10, scale: 1, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(16)", maxLength: 16, nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SerializedParts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SerializedParts_Parts_PartId",
                        column: x => x.PartId,
                        principalTable: "Parts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "InstallRecords",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SerializedPartId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CarId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    InstalledAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    RemovedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    UsageAtRemoval = table.Column<decimal>(type: "decimal(10,1)", precision: 10, scale: 1, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InstallRecords", x => x.Id);
                    table.ForeignKey(
                        name: "FK_InstallRecords_Cars_CarId",
                        column: x => x.CarId,
                        principalTable: "Cars",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_InstallRecords_SerializedParts_SerializedPartId",
                        column: x => x.SerializedPartId,
                        principalTable: "SerializedParts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Cars_CarNumber",
                table: "Cars",
                column: "CarNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Cars_ChassisId",
                table: "Cars",
                column: "ChassisId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_InstallRecords_CarId",
                table: "InstallRecords",
                column: "CarId");

            migrationBuilder.CreateIndex(
                name: "IX_InstallRecords_SerializedPartId_InstalledAt",
                table: "InstallRecords",
                columns: new[] { "SerializedPartId", "InstalledAt" });

            migrationBuilder.CreateIndex(
                name: "UX_InstallRecords_OneOpenInstallPerPart",
                table: "InstallRecords",
                column: "SerializedPartId",
                unique: true,
                filter: "[RemovedAt] IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Parts_PartNumber",
                table: "Parts",
                column: "PartNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SerializedParts_PartId",
                table: "SerializedParts",
                column: "PartId");

            migrationBuilder.CreateIndex(
                name: "IX_SerializedParts_SerialNumber",
                table: "SerializedParts",
                column: "SerialNumber",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "InstallRecords");

            migrationBuilder.DropTable(
                name: "Cars");

            migrationBuilder.DropTable(
                name: "SerializedParts");

            migrationBuilder.DropTable(
                name: "Parts");
        }
    }
}
