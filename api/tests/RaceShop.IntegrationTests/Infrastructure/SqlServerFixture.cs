using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RaceShop.Domain.Cars;
using RaceShop.Domain.Parts;
using RaceShop.Infrastructure.Persistence;
using Testcontainers.MsSql;

namespace RaceShop.IntegrationTests.Infrastructure;

/// <summary>
/// One SQL Server container for every database test, with migrations applied once.
/// Tests create their own uniquely numbered data instead of resetting the database,
/// so they stay independent and can run in any order.
/// </summary>
public sealed class SqlServerFixture : IAsyncLifetime
{
    // Same engine family as Azure SQL Database. Pin a CU tag here if a release ever breaks the tests.
    private const string Image = "mcr.microsoft.com/mssql/server:2022-latest";

    private readonly MsSqlContainer _container = new MsSqlBuilder(Image).Build();

    public ApiFactory Api { get; private set; } = null!;

    public async ValueTask InitializeAsync()
    {
        await _container.StartAsync();
        Api = new ApiFactory(_container.GetConnectionString());

        await using var scope = Api.Services.CreateAsyncScope();
        await scope.ServiceProvider.GetRequiredService<RaceShopDbContext>().Database.MigrateAsync();
    }

    public async ValueTask DisposeAsync()
    {
        if (Api is not null)
        {
            await Api.DisposeAsync();
        }

        await _container.DisposeAsync();
    }

    /// <summary>Adds a car and a serialized part (500-mile life) with the given usage.</summary>
    public async Task<(Car Car, SerializedPart Part)> SeedAsync(decimal accumulatedMiles = 0)
    {
        var unique = Guid.NewGuid().ToString("N");
        var car = new Car(unique[..8], "Test Team", $"CH-{unique}");
        var part = new Part($"TP-{unique}", "Test rotor", "Brakes", "TestCo", new LifeLimit(500m, LifeUnit.Miles), 100m);
        var serialized = new SerializedPart(part, $"SN-{unique}", accumulatedMiles);

        await using var scope = Api.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<RaceShopDbContext>();
        db.AddRange(car, part, serialized);
        await db.SaveChangesAsync();
        return (car, serialized);
    }

    public async Task<Car> SeedCarAsync()
    {
        var unique = Guid.NewGuid().ToString("N");
        var car = new Car(unique[..8], "Test Team", $"CH-{unique}");

        await using var scope = Api.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<RaceShopDbContext>();
        db.Cars.Add(car);
        await db.SaveChangesAsync();
        return car;
    }
}

[CollectionDefinition(Name)]
public sealed class SqlServerTestGroup : ICollectionFixture<SqlServerFixture>
{
    public const string Name = "SQL Server";
}
