using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RaceShop.Application;
using RaceShop.Infrastructure.Persistence;
using RaceShop.IntegrationTests.Infrastructure;

namespace RaceShop.IntegrationTests.Inventory;

/// <summary>
/// The domain rule ("one car at a time") only sees one request at a time. These tests prove the
/// database still holds the rule when two requests race, or when something bypasses the domain.
/// </summary>
[Trait("Category", "Database")]
[Collection(SqlServerTestGroup.Name)]
public sealed class ConcurrencyTests(SqlServerFixture db)
{
    [Fact]
    public async Task TwoInstallsLoadedTogether_SecondSaveIsAConflict()
    {
        var (car, part) = await db.SeedAsync();
        var otherCar = await db.SeedCarAsync();
        await using var first = db.Api.Services.CreateAsyncScope();
        await using var second = db.Api.Services.CreateAsyncScope();
        var storeA = first.ServiceProvider.GetRequiredService<IInventoryStore>();
        var storeB = second.ServiceProvider.GetRequiredService<IInventoryStore>();
        var ct = TestContext.Current.CancellationToken;

        // Both requests read the part while it is still in stock.
        var partA = await storeA.GetSerializedPartAsync(part.Id, ct);
        var partB = await storeB.GetSerializedPartAsync(part.Id, ct);
        partA!.InstallOn((await storeA.GetCarAsync(car.Id, ct))!, DateTimeOffset.UtcNow);
        partB!.InstallOn((await storeB.GetCarAsync(otherCar.Id, ct))!, DateTimeOffset.UtcNow);

        await storeA.SaveChangesAsync(ct);
        await Assert.ThrowsAsync<ConcurrencyConflictException>(() => storeB.SaveChangesAsync(ct));
    }

    [Fact]
    public async Task SecondOpenInstallInsertedDirectly_IsRejectedByUniqueIndex()
    {
        var (car, part) = await db.SeedAsync();
        await using var scope = db.Api.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<RaceShopDbContext>();
        var ct = TestContext.Current.CancellationToken;

        const string Insert = """
            INSERT INTO InstallRecords (Id, SerializedPartId, CarId, InstalledAt)
            VALUES (NEWID(), {0}, {1}, SYSDATETIMEOFFSET())
            """;
        await context.Database.ExecuteSqlRawAsync(Insert, [part.Id, car.Id], ct);

        var error = await Assert.ThrowsAsync<SqlException>(
            () => context.Database.ExecuteSqlRawAsync(Insert, [part.Id, car.Id], ct));
        Assert.Equal(2601, error.Number);
    }
}
