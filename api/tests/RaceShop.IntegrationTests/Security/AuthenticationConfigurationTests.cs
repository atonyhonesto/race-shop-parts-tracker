using System.Net;
using RaceShop.Api.Auth;
using RaceShop.IntegrationTests.Infrastructure;

namespace RaceShop.IntegrationTests.Security;

public sealed class AuthenticationConfigurationTests
{
    [Theory]
    [InlineData("Production")]
    [InlineData("Staging")]
    public async Task DevScheme_OutsideDevelopmentOrTesting_FailsStartup(string environment)
    {
        await using var api = new ApiFactory(environment: environment, authMode: DevAuthHandler.SchemeName);

        var error = Assert.Throws<InvalidOperationException>(() => api.CreateClient());

        Assert.Contains("only allowed in Development or Testing", error.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task EntraMode_WithoutTenantOrClientId_FailsStartup()
    {
        await using var api = new ApiFactory(environment: "Production", authMode: AuthenticationSetup.EntraMode);

        var error = Assert.Throws<InvalidOperationException>(() => api.CreateClient());

        Assert.Contains("AzureAd:TenantId", error.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task EntraMode_RequestWithoutBearerToken_Returns401WithBearerChallenge()
    {
        await using var api = new ApiFactory(
            environment: "Production",
            authMode: AuthenticationSetup.EntraMode,
            settings: new Dictionary<string, string>
            {
                ["AzureAd:TenantId"] = "00000000-0000-0000-0000-000000000001",
                ["AzureAd:ClientId"] = "00000000-0000-0000-0000-000000000002",
            });
        using var client = api.CreateClient();

        using var response = await client.GetAsync("/api/parts", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Contains(response.Headers.WwwAuthenticate, header => header.Scheme == "Bearer");
    }

    [Fact]
    public async Task DevScheme_HeadersAreIgnoredInEntraMode()
    {
        await using var api = new ApiFactory(
            environment: "Production",
            authMode: AuthenticationSetup.EntraMode,
            settings: new Dictionary<string, string>
            {
                ["AzureAd:TenantId"] = "00000000-0000-0000-0000-000000000001",
                ["AzureAd:ClientId"] = "00000000-0000-0000-0000-000000000002",
            });
        using var client = api.CreateClientAs("attacker", AppRoles.PartsManager);

        using var response = await client.GetAsync("/api/parts", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
