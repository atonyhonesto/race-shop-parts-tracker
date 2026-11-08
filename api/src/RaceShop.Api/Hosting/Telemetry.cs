using Azure.Monitor.OpenTelemetry.AspNetCore;
using OpenTelemetry.Instrumentation.AspNetCore;

namespace RaceShop.Api.Hosting;

/// <summary>
/// Traces, logs and metrics to Application Insights through OpenTelemetry, only when
/// APPLICATIONINSIGHTS_CONNECTION_STRING is set (it is in Azure; local runs and tests send nothing).
/// Application Insights is capped at 0.1 GB/day (infra/modules/monitoring.bicep), so requests are
/// sampled and health probes are not traced at all.
/// </summary>
internal static class TelemetrySetup
{
    public const string ConnectionStringKey = "APPLICATIONINSIGHTS_CONNECTION_STRING";

    public static IServiceCollection AddRaceShopTelemetry(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration[ConnectionStringKey];
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            return services;
        }

        services.AddOpenTelemetry().UseAzureMonitor(options =>
        {
            options.ConnectionString = connectionString;
            options.SamplingRatio = configuration.GetValue("Telemetry:SamplingRatio", 0.25f);
        });
        services.Configure<AspNetCoreTraceInstrumentationOptions>(options =>
            options.Filter = context => !context.Request.Path.StartsWithSegments("/health", StringComparison.Ordinal));
        return services;
    }
}
