using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;

namespace RaceShop.Api.Auth;

/// <summary>App roles defined on the Entra ID API registration (docs/auth/entra-setup.md).</summary>
internal static class AppRoles
{
    public const string CrewChief = "CrewChief";
    public const string PartsManager = "PartsManager";
}

internal static class Policies
{
    /// <summary>View parts, cars and install status. Both roles.</summary>
    public const string ReadInventory = "ReadInventory";

    /// <summary>Install, remove or retire parts. Parts managers only.</summary>
    public const string ManageInventory = "ManageInventory";
}

internal static class AuthorizationSetup
{
    /// <summary>The delegated scope the SPA and desktop app request. Rejects tokens issued without it.</summary>
    public const string RequiredScope = "access_as_user";

    // Entra ID puts delegated scopes in "scp". JwtBearer's default claim mapping renames it.
    private static readonly string[] ScopeClaimTypes = ["scp", "http://schemas.microsoft.com/identity/claims/scope"];

    public static IServiceCollection AddRaceShopAuthorization(this IServiceCollection services)
    {
        services.AddAuthorizationBuilder()
            // An endpoint that forgets RequireAuthorization still needs a signed-in user. Nothing is public by accident.
            .SetFallbackPolicy(new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build())
            .AddPolicy(Policies.ReadInventory, policy => policy
                .RequireAuthenticatedUser()
                .RequireAssertion(context => HasRequiredScope(context.User))
                .RequireRole(AppRoles.CrewChief, AppRoles.PartsManager))
            .AddPolicy(Policies.ManageInventory, policy => policy
                .RequireAuthenticatedUser()
                .RequireAssertion(context => HasRequiredScope(context.User))
                .RequireRole(AppRoles.PartsManager));

        return services;
    }

    private static bool HasRequiredScope(ClaimsPrincipal user) =>
        user.Claims
            .Where(claim => ScopeClaimTypes.Contains(claim.Type))
            .SelectMany(claim => claim.Value.Split(' ', StringSplitOptions.RemoveEmptyEntries))
            .Contains(RequiredScope, StringComparer.Ordinal);
}
