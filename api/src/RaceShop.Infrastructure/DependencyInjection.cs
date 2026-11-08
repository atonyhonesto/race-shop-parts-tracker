using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RaceShop.Application;
using RaceShop.Infrastructure.Persistence;

namespace RaceShop.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, string? connectionString)
    {
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                "Connection string 'RaceShop' is not configured. For local runs see CONTRIBUTING.md (user secrets).");
        }

        services.AddDbContext<RaceShopDbContext>(options => options.UseSqlServer(
            connectionString,
            sql => sql.EnableRetryOnFailure(
                // Azure SQL free tier auto-pauses; the first query after a pause waits while the
                // database resumes, which can take up to about a minute. Retries cover that window.
                maxRetryCount: 6,
                maxRetryDelay: TimeSpan.FromSeconds(15),
                errorNumbersToAdd: null)));

        services.AddScoped<IInventoryStore, EfInventoryStore>();
        services.AddScoped<IInventoryQueries, EfInventoryQueries>();
        return services;
    }
}
