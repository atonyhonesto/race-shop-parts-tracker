using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Identity.Web;

namespace RaceShop.Api.Auth;

internal static class AuthenticationSetup
{
    public const string ModeKey = "Authentication:Mode";
    public const string EntraMode = "Entra";

    /// <summary>
    /// Production: validate Entra ID access tokens (JWT bearer).
    /// Development and tests: <see cref="DevAuthHandler"/>, so no tenant is needed. Startup fails if
    /// it is switched on in any other environment.
    /// </summary>
    public static IServiceCollection AddRaceShopAuthentication(
        this IServiceCollection services,
        IConfiguration configuration,
        IHostEnvironment environment)
    {
        var mode = configuration[ModeKey] ?? EntraMode;

        if (string.Equals(mode, DevAuthHandler.SchemeName, StringComparison.OrdinalIgnoreCase))
        {
            if (!environment.IsDevelopment() && !environment.IsEnvironment("Testing"))
            {
                throw new InvalidOperationException(
                    $"{ModeKey}={DevAuthHandler.SchemeName} is only allowed in Development or Testing, " +
                    $"not in '{environment.EnvironmentName}'. It trusts request headers and must never run in production.");
            }

            services.AddAuthentication(DevAuthHandler.SchemeName)
                .AddScheme<AuthenticationSchemeOptions, DevAuthHandler>(DevAuthHandler.SchemeName, configureOptions: null);
            return services;
        }

        if (!string.Equals(mode, EntraMode, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException($"Unknown {ModeKey} '{mode}'. Use '{EntraMode}' or '{DevAuthHandler.SchemeName}'.");
        }

        var azureAd = configuration.GetSection("AzureAd");
        if (string.IsNullOrWhiteSpace(azureAd["TenantId"]) || string.IsNullOrWhiteSpace(azureAd["ClientId"]))
        {
            throw new InvalidOperationException(
                "AzureAd:TenantId and AzureAd:ClientId must be set when Authentication:Mode is Entra. " +
                "See docs/auth/entra-setup.md.");
        }

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddMicrosoftIdentityWebApi(azureAd);
        return services;
    }
}
