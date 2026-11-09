using Microsoft.EntityFrameworkCore;
using RaceShop.Infrastructure.Persistence;

// Usage: dotnet run --project api/tools/RaceShop.Seed -- --connection "<connection string>" [--profile demo]
//
// Profiles:
//   demo  A handful of cars, parts and installs: enough to try every screen (DevelopmentData).
//         Only adds data to an empty database, so re-running it changes nothing.
//
// In Azure, the connection string uses "Authentication=Active Directory Default" and runs as the
// SQL admins group from .github/workflows/seed.yml. No passwords are involved.

var connection = ValueOf("--connection");
var profile = ValueOf("--profile") ?? "demo";

if (string.IsNullOrWhiteSpace(connection))
{
    await Console.Error.WriteLineAsync("Usage: RaceShop.Seed --connection \"<connection string>\" [--profile demo]");
    return 2;
}

if (profile != "demo")
{
    await Console.Error.WriteLineAsync($"Unknown profile '{profile}'. Available: demo.");
    return 2;
}

var options = new DbContextOptionsBuilder<RaceShopDbContext>()
    // Azure SQL may be paused (free offer): retry while it resumes.
    .UseSqlServer(connection, sql => sql.EnableRetryOnFailure(6, TimeSpan.FromSeconds(15), errorNumbersToAdd: null))
    .Options;

await using var db = new RaceShopDbContext(options);

if ((await db.Database.GetPendingMigrationsAsync()).Any())
{
    await Console.Error.WriteLineAsync("The database is missing migrations. Run the deploy (or dotnet ef database update) first.");
    return 1;
}

var partsBefore = await db.Parts.CountAsync();
await DevelopmentData.SeedAsync(db, TimeProvider.System, CancellationToken.None);

Console.WriteLine(partsBefore > 0
    ? $"Database already has data ({partsBefore} parts); nothing added."
    : "Seeded the demo profile.");
Console.WriteLine(
    $"Cars: {await db.Cars.CountAsync()}, parts: {await db.Parts.CountAsync()}, " +
    $"serialized parts: {await db.SerializedParts.CountAsync()}, open installs: " +
    $"{await db.InstallRecords.CountAsync(i => i.RemovedAt == null)}");
return 0;

string? ValueOf(string name)
{
    var index = Array.IndexOf(args, name);
    return index >= 0 && index + 1 < args.Length ? args[index + 1] : null;
}
