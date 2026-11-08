using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using RaceShop.Infrastructure.Persistence;

namespace RaceShop.Api.Hosting;

/// <summary>
/// Two health endpoints, on purpose (docs/runbook.md):
/// <list type="bullet">
///   <item><c>/health</c>: liveness. The process is up. Never touches the database, so frequent
///   probes don't keep Azure SQL awake and burn the free monthly allowance.</item>
///   <item><c>/health/ready</c>: the API can reach the database. Wakes a paused database (can take
///   about a minute). Used by the deploy smoke test, not by periodic probes.</item>
/// </list>
/// </summary>
internal static class HealthSetup
{
    public const string ReadyTag = "ready";

    public static IServiceCollection AddRaceShopHealthChecks(this IServiceCollection services)
    {
        services.AddHealthChecks().AddCheck<DatabaseHealthCheck>("database", tags: [ReadyTag]);
        return services;
    }

    public static IEndpointRouteBuilder MapRaceShopHealthChecks(this IEndpointRouteBuilder app)
    {
        app.MapHealthChecks("/health", new HealthCheckOptions { Predicate = _ => false }).AllowAnonymous();
        app.MapHealthChecks("/health/ready", new HealthCheckOptions { Predicate = check => check.Tags.Contains(ReadyTag) })
            .AllowAnonymous();
        return app;
    }
}

internal sealed class DatabaseHealthCheck(RaceShopDbContext db) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default) =>
        await db.Database.CanConnectAsync(cancellationToken)
            ? HealthCheckResult.Healthy()
            : HealthCheckResult.Unhealthy("Cannot connect to the database.");
}
