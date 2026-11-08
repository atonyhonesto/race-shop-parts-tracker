using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;

namespace RaceShop.Api.Auth;

/// <summary>
/// Signs the caller in from request headers, for local runs and integration tests only.
/// <see cref="AuthenticationSetup"/> refuses to register it outside Development and Testing.
/// </summary>
/// <example>
/// <c>X-Dev-User: alex</c> and <c>X-Dev-Roles: PartsManager</c>. With no user header the request is
/// anonymous, so the 401 path is exercised the same way it is in production.
/// </example>
internal sealed class DevAuthHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string SchemeName = "Dev";
    public const string UserHeader = "X-Dev-User";
    public const string RolesHeader = "X-Dev-Roles";

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var user = Request.Headers[UserHeader].ToString();
        if (string.IsNullOrWhiteSpace(user))
        {
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        // Same claim shapes as a real Entra ID token after JwtBearer claim mapping, so the policies are identical.
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user),
            new(ClaimTypes.Name, user),
            new("scp", AuthorizationSetup.RequiredScope),
        };
        claims.AddRange(
            Request.Headers[RolesHeader].ToString()
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(role => new Claim(ClaimTypes.Role, role)));

        var principal = new ClaimsPrincipal(new ClaimsIdentity(claims, SchemeName));
        return Task.FromResult(AuthenticateResult.Success(new AuthenticationTicket(principal, SchemeName)));
    }
}
