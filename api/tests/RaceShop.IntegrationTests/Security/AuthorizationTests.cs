using System.Net;
using System.Net.Http.Json;
using RaceShop.Api.Auth;
using RaceShop.IntegrationTests.Infrastructure;

namespace RaceShop.IntegrationTests.Security;

/// <summary>
/// 401 and 403 paths. Authorization runs before any handler, so these need no database.
/// The allowed paths (200) are covered by the database tests.
/// </summary>
public sealed class AuthorizationTests(AuthorizationTests.Fixture fixture) : IClassFixture<AuthorizationTests.Fixture>
{
    private static readonly string AnyId = Guid.NewGuid().ToString();

    public static TheoryData<string, string> ReadEndpoints => new()
    {
        { "GET", "/api/parts" },
        { "GET", $"/api/parts/{AnyId}" },
        { "GET", "/api/cars" },
        { "GET", $"/api/serialized-parts/{AnyId}" },
    };

    public static TheoryData<string, string> WriteEndpoints => new()
    {
        { "POST", $"/api/serialized-parts/{AnyId}/install" },
        { "POST", $"/api/serialized-parts/{AnyId}/remove" },
        { "POST", $"/api/serialized-parts/{AnyId}/retire" },
    };

    [Theory]
    [MemberData(nameof(ReadEndpoints))]
    [MemberData(nameof(WriteEndpoints))]
    public async Task NoToken_Returns401(string method, string path)
    {
        using var client = fixture.Api.CreateClientAs(user: null);

        using var response = await client.SendAsync(Request(method, path), TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Theory]
    [MemberData(nameof(ReadEndpoints))]
    [MemberData(nameof(WriteEndpoints))]
    public async Task SignedInWithoutAppRole_Returns403(string method, string path)
    {
        using var client = fixture.Api.CreateClientAs("no-role-user");

        using var response = await client.SendAsync(Request(method, path), TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Theory]
    [MemberData(nameof(WriteEndpoints))]
    public async Task CrewChief_CannotInstallRemoveOrRetire_Returns403(string method, string path)
    {
        using var client = fixture.Api.CreateClientAs("casey", AppRoles.CrewChief);

        using var response = await client.SendAsync(Request(method, path), TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task PartsManager_RemoveWithNegativeUsage_Returns400BeforeTouchingData()
    {
        using var client = fixture.Api.CreateClientAs("alex", AppRoles.PartsManager);

        using var response = await client.PostAsJsonAsync(
            $"/api/serialized-parts/{AnyId}/remove",
            new { usageSinceInstall = -5 },
            TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
    }

    [Theory]
    [InlineData("/health")]
    [InlineData("/openapi/v1.json")]
    public async Task OperationalEndpoints_AreAnonymous(string path)
    {
        using var client = fixture.Api.CreateClientAs(user: null);

        using var response = await client.GetAsync(path, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    private static HttpRequestMessage Request(string method, string path) =>
        new(new HttpMethod(method), path)
        {
            Content = method == "POST" ? JsonContent.Create(new { }) : null,
        };

    public sealed class Fixture : IAsyncDisposable
    {
        public ApiFactory Api { get; } = new();

        public ValueTask DisposeAsync() => Api.DisposeAsync();
    }
}
