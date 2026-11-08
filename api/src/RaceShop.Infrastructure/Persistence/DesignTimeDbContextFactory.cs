using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace RaceShop.Infrastructure.Persistence;

/// <summary>
/// Used only by the `dotnet ef` tool, so creating a migration doesn't need to start the API
/// or have its configuration. `migrations add` never opens a connection. Commands that do
/// connect read the ConnectionStrings__RaceShop environment variable.
/// </summary>
internal sealed class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<RaceShopDbContext>
{
    private const string PlaceholderConnection = "Server=localhost,1433;Database=RaceShop;TrustServerCertificate=True";

    public RaceShopDbContext CreateDbContext(string[] args)
    {
        var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__RaceShop") ?? PlaceholderConnection;
        var options = new DbContextOptionsBuilder<RaceShopDbContext>().UseSqlServer(connectionString).Options;
        return new RaceShopDbContext(options);
    }
}
