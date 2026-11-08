using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using RaceShop.Api.Auth;

namespace RaceShop.IntegrationTests.Infrastructure;

/// <summary>
/// Hosts the API in memory. Settings go in through UseSetting, so each factory gets its own
/// configuration and tests can run in parallel.
/// </summary>
public sealed class ApiFactory(
    string connectionString = ApiFactory.NoDatabase,
    string environment = "Testing",
    string authMode = DevAuthHandler.SchemeName,
    IReadOnlyDictionary<string, string>? settings = null) : WebApplicationFactory<Program>
{
    /// <summary>For tests that never reach the database. Any attempt to connect fails fast.</summary>
    public const string NoDatabase = "Server=127.0.0.1,1;Database=None;Connect Timeout=1;TrustServerCertificate=True";

    public static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment(environment);
        builder.UseSetting("ConnectionStrings:RaceShop", connectionString);
        builder.UseSetting(AuthenticationSetup.ModeKey, authMode);
        foreach (var (key, value) in settings ?? new Dictionary<string, string>())
        {
            builder.UseSetting(key, value);
        }
    }

    /// <summary>A client signed in through the Dev scheme. Pass no user for an anonymous client.</summary>
    public HttpClient CreateClientAs(string? user, params string[] roles)
    {
        var client = CreateClient();
        if (user is not null)
        {
            client.DefaultRequestHeaders.Add(DevAuthHandler.UserHeader, user);
            client.DefaultRequestHeaders.Add(DevAuthHandler.RolesHeader, string.Join(',', roles));
        }

        return client;
    }
}
