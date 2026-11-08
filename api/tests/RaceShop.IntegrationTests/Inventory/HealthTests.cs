using System.Net;
using RaceShop.IntegrationTests.Infrastructure;

namespace RaceShop.IntegrationTests.Inventory;

public sealed class LivenessTests
{
    [Fact]
    public async Task Liveness_DoesNotTouchTheDatabase()
    {
        // Points at a server that doesn't exist: liveness must still be healthy, so periodic probes
        // never wake (and bill) a paused Azure SQL database.
        await using var api = new ApiFactory();
        using var client = api.CreateClient();

        using var response = await client.GetAsync("/health", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}

[Trait("Category", "Database")]
[Collection(SqlServerTestGroup.Name)]
public sealed class ReadinessTests(SqlServerFixture db)
{
    [Fact]
    public async Task Readiness_ChecksTheDatabase()
    {
        using var client = db.Api.CreateClient();

        using var response = await client.GetAsync("/health/ready", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("Healthy", await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken));
    }
}
