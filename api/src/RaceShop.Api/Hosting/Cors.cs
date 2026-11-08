namespace RaceShop.Api.Hosting;

/// <summary>
/// The web app (Static Web Apps Free) and the API (App Service) are on different origins, and
/// the Free tier can't proxy to an external API, so the API allows the web app's origin explicitly.
/// The browser sends bearer tokens, not cookies, so credentials mode stays off.
/// </summary>
internal static class CorsSetup
{
    public const string ConfigKey = "Cors:AllowedOrigins";

    public static IServiceCollection AddRaceShopCors(this IServiceCollection services, IConfiguration configuration)
    {
        var origins = configuration.GetSection(ConfigKey).Get<string[]>() ?? [];
        foreach (var origin in origins)
        {
            if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri)
                || uri.AbsolutePath != "/"
                || !(uri.Scheme == Uri.UriSchemeHttps || uri.IsLoopback))
            {
                throw new InvalidOperationException(
                    $"{ConfigKey} entry '{origin}' must be an https origin such as https://app.example.com " +
                    "(http is allowed only for localhost). Wildcards are not allowed.");
            }
        }

        services.AddCors(options => options.AddDefaultPolicy(policy => policy
            .WithOrigins(origins)
            .WithMethods(HttpMethods.Get, HttpMethods.Post)
            .WithHeaders("Authorization", "Content-Type")
            .SetPreflightMaxAge(TimeSpan.FromHours(1))));
        return services;
    }
}
