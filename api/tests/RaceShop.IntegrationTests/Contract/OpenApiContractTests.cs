using System.Text.Json;
using System.Text.Json.Nodes;
using RaceShop.IntegrationTests.Infrastructure;

namespace RaceShop.IntegrationTests.Contract;

/// <summary>
/// The TypeScript client (packages/api-client) is generated from a committed copy of the OpenAPI
/// document. This test fails when the API's contract and that copy differ, so a contract change
/// always comes with a regenerated client in the same PR (ADR 0005).
/// </summary>
/// <remarks>To update the copy: <c>pnpm api:contract</c> (sets UPDATE_OPENAPI=1 and regenerates the client).</remarks>
public sealed class OpenApiContractTests
{
    private static readonly JsonSerializerOptions Indented = new() { WriteIndented = true };

    [Fact]
    public async Task CommittedOpenApiDocument_MatchesTheApi()
    {
        await using var api = new ApiFactory();
        using var client = api.CreateClient();
        var json = await client.GetStringAsync("/openapi/v1.json", TestContext.Current.CancellationToken);
        var actual = JsonNode.Parse(json)!.ToJsonString(Indented).ReplaceLineEndings("\n") + "\n";

        var path = Path.Combine(RepositoryRoot(), "packages", "api-client", "openapi.json");
        if (Environment.GetEnvironmentVariable("UPDATE_OPENAPI") == "1")
        {
            await File.WriteAllTextAsync(path, actual, TestContext.Current.CancellationToken);
            return;
        }

        Assert.True(File.Exists(path), $"Missing {path}. Run `pnpm api:contract`.");
        var committed = (await File.ReadAllTextAsync(path, TestContext.Current.CancellationToken)).ReplaceLineEndings("\n");
        Assert.True(
            committed == actual,
            "The API's OpenAPI document differs from packages/api-client/openapi.json. " +
            "Run `pnpm api:contract` and commit the regenerated client.");
    }

    private static string RepositoryRoot()
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);
        while (directory is not null && !File.Exists(Path.Combine(directory.FullName, "pnpm-workspace.yaml")))
        {
            directory = directory.Parent;
        }

        return directory?.FullName ?? throw new InvalidOperationException("Repository root not found.");
    }
}
