using Microsoft.EntityFrameworkCore;
using RaceShop.Infrastructure.Persistence;

namespace RaceShop.Api;

internal static class DevelopmentDatabase
{
    /// <summary>
    /// Local runs only: apply migrations and add sample data at startup. Deployed environments
    /// apply migrations in the deploy pipeline, never from the running app.
    /// </summary>
    public static async Task MigrateAndSeedAsync(this WebApplication app)
    {
        await using var scope = app.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<RaceShopDbContext>();
        var clock = scope.ServiceProvider.GetRequiredService<TimeProvider>();

        await db.Database.MigrateAsync(app.Lifetime.ApplicationStopping);
        await DevelopmentData.SeedAsync(db, clock, app.Lifetime.ApplicationStopping);
    }
}
