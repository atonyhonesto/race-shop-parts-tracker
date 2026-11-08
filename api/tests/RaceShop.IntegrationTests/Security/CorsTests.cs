using System.Net;
using RaceShop.IntegrationTests.Infrastructure;

namespace RaceShop.IntegrationTests.Security;

/// <summary>The web app (Static Web Apps) calls the API cross-origin; only its origin is allowed.</summary>
public sealed class CorsTests(CorsTests.Fixture fixture) : IClassFixture<CorsTests.Fixture>
{
    private const string WebApp = "https://red-sand-0a1b2c3d4.azurestaticapps.net";

    private static HttpRequestMessage Preflight(string origin) =>
        new(HttpMethod.Options, "/api/parts")
        {
            Headers =
            {
                { "Origin", origin },
                { "Access-Control-Request-Method", "GET" },
                { "Access-Control-Request-Headers", "authorization" },
            },
        };

    [Fact]
    public async Task Preflight_FromTheWebApp_IsAllowedWithoutAToken()
    {
        using var client = fixture.Api.CreateClient();

        using var response = await client.SendAsync(Preflight(WebApp), TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(WebApp, response.Headers.GetValues("Access-Control-Allow-Origin").Single());
        Assert.False(response.Headers.Contains("Access-Control-Allow-Credentials"));
    }

    [Fact]
    public async Task Preflight_FromAnotherOrigin_GetsNoCorsHeaders()
    {
        using var client = fixture.Api.CreateClient();

        using var response = await client.SendAsync(
            Preflight("https://evil.example.com"),
            TestContext.Current.CancellationToken);

        Assert.False(response.Headers.Contains("Access-Control-Allow-Origin"));
    }

    [Fact]
    public async Task UnauthorizedResponse_StillCarriesCorsHeaders_SoTheWebAppCanReadIt()
    {
        using var client = fixture.Api.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/parts") { Headers = { { "Origin", WebApp } } };

        using var response = await client.SendAsync(request, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal(WebApp, response.Headers.GetValues("Access-Control-Allow-Origin").Single());
    }

    [Theory]
    [InlineData("*")]
    [InlineData("http://web.example.com")]
    [InlineData("https://web.example.com/path")]
    public async Task UnsafeOrigins_FailStartup(string origin)
    {
        await using var api = new ApiFactory(settings: new Dictionary<string, string> { ["Cors:AllowedOrigins:0"] = origin });

        var error = Assert.Throws<InvalidOperationException>(() => api.CreateClient());

        Assert.Contains("Cors:AllowedOrigins", error.Message, StringComparison.Ordinal);
    }

    public sealed class Fixture : IAsyncDisposable
    {
        public ApiFactory Api { get; } = new(settings: new Dictionary<string, string> { ["Cors:AllowedOrigins:0"] = WebApp });

        public ValueTask DisposeAsync() => Api.DisposeAsync();
    }
}
