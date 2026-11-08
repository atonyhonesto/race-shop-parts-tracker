using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using RaceShop.Api.Auth;
using RaceShop.Application.Installs;
using RaceShop.Application.Queries;
using RaceShop.Domain.Parts;
using RaceShop.IntegrationTests.Infrastructure;

namespace RaceShop.IntegrationTests.Inventory;

/// <summary>End-to-end through HTTP, EF Core and SQL Server. Needs Docker.</summary>
[Trait("Category", "Database")]
[Collection(SqlServerTestGroup.Name)]
public sealed class InstallFlowTests(SqlServerFixture db)
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private HttpClient Manager() => db.Api.CreateClientAs("alex", AppRoles.PartsManager);

    private HttpClient CrewChief() => db.Api.CreateClientAs("casey", AppRoles.CrewChief);

    [Fact]
    public async Task PartsManager_InstallsPart_AndCrewChiefSeesItOnTheCar()
    {
        var (car, part) = await db.SeedAsync(accumulatedMiles: 100);
        using var manager = Manager();
        using var crewChief = CrewChief();

        using var install = await manager.PostAsJsonAsync($"/api/serialized-parts/{part.Id}/install", new { carId = car.Id }, Ct);

        Assert.Equal(HttpStatusCode.OK, install.StatusCode);
        var result = await install.Content.ReadFromJsonAsync<InstallPartResult>(ApiFactory.Json, Ct);
        Assert.Equal(LifeStatus.Ok, result?.LifeStatus);

        var details = await crewChief.GetFromJsonAsync<SerializedPartDetails>($"/api/serialized-parts/{part.Id}", ApiFactory.Json, Ct);
        Assert.Equal(PartStatus.Installed, details?.Status);
        Assert.Equal(car.CarNumber, details?.CurrentInstall?.CarNumber);
    }

    [Fact]
    public async Task InstallingOnASecondCar_Returns409AlreadyInstalled()
    {
        var (car, part) = await db.SeedAsync();
        var otherCar = await db.SeedCarAsync();
        using var manager = Manager();
        (await manager.PostAsJsonAsync($"/api/serialized-parts/{part.Id}/install", new { carId = car.Id }, Ct)).EnsureSuccessStatusCode();

        using var second = await manager.PostAsJsonAsync($"/api/serialized-parts/{part.Id}/install", new { carId = otherCar.Id }, Ct);

        await AssertProblemAsync(second, HttpStatusCode.Conflict, "part.already_installed");
    }

    [Fact]
    public async Task PartAtEightyPercent_InstallsWithWarning()
    {
        var (car, part) = await db.SeedAsync(accumulatedMiles: 400);
        using var manager = Manager();

        using var response = await manager.PostAsJsonAsync($"/api/serialized-parts/{part.Id}/install", new { carId = car.Id }, Ct);

        var result = await response.Content.ReadFromJsonAsync<InstallPartResult>(ApiFactory.Json, Ct);
        Assert.Equal(LifeStatus.Warning, result?.LifeStatus);
        Assert.Equal(80.0m, result?.LifeUsedPercent);
    }

    [Fact]
    public async Task PartAtLifeLimit_Returns409LifeExpired()
    {
        var (car, part) = await db.SeedAsync(accumulatedMiles: 500);
        using var manager = Manager();

        using var response = await manager.PostAsJsonAsync($"/api/serialized-parts/{part.Id}/install", new { carId = car.Id }, Ct);

        await AssertProblemAsync(response, HttpStatusCode.Conflict, "part.life_expired");
    }

    [Fact]
    public async Task Remove_AddsMilesAndReturnsPartToStock()
    {
        var (car, part) = await db.SeedAsync(accumulatedMiles: 100);
        using var manager = Manager();
        (await manager.PostAsJsonAsync($"/api/serialized-parts/{part.Id}/install", new { carId = car.Id }, Ct)).EnsureSuccessStatusCode();

        using var remove = await manager.PostAsJsonAsync($"/api/serialized-parts/{part.Id}/remove", new { usageSinceInstall = 312.5m }, Ct);

        Assert.Equal(HttpStatusCode.NoContent, remove.StatusCode);
        var details = await manager.GetFromJsonAsync<SerializedPartDetails>($"/api/serialized-parts/{part.Id}", ApiFactory.Json, Ct);
        Assert.Equal(PartStatus.InStock, details?.Status);
        Assert.Equal(412.5m, details?.AccumulatedUsage);
        Assert.Equal(LifeStatus.Warning, details?.LifeStatus);
        Assert.Null(details?.CurrentInstall);
    }

    [Fact]
    public async Task Retire_InstalledPart_Returns409()
    {
        var (car, part) = await db.SeedAsync();
        using var manager = Manager();
        (await manager.PostAsJsonAsync($"/api/serialized-parts/{part.Id}/install", new { carId = car.Id }, Ct)).EnsureSuccessStatusCode();

        using var retire = await manager.PostAsync($"/api/serialized-parts/{part.Id}/retire", content: null, Ct);

        await AssertProblemAsync(retire, HttpStatusCode.Conflict, "part.installed");
    }

    [Fact]
    public async Task UnknownPart_Returns404Problem()
    {
        var car = await db.SeedCarAsync();
        using var manager = Manager();

        using var response = await manager.PostAsJsonAsync($"/api/serialized-parts/{Guid.NewGuid()}/install", new { carId = car.Id }, Ct);

        await AssertProblemAsync(response, HttpStatusCode.NotFound, "not_found");
    }

    [Fact]
    public async Task CrewChief_CanSearchParts_WithStockCounts()
    {
        var (_, part) = await db.SeedAsync();
        using var crewChief = CrewChief();

        var page = await crewChief.GetFromJsonAsync<PagedResult<PartSummary>>(
            $"/api/parts?search={part.Part.PartNumber}", ApiFactory.Json, Ct);

        var summary = Assert.Single(page!.Items);
        Assert.Equal(1, page.TotalCount);
        Assert.Equal(1, summary.InStockCount);
        Assert.Equal(0, summary.InstalledCount);
    }

    private static async Task AssertProblemAsync(HttpResponseMessage response, HttpStatusCode status, string code)
    {
        Assert.Equal(status, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>(Ct);
        Assert.Equal(code, problem.GetProperty("code").GetString());
        Assert.True(problem.TryGetProperty("traceId", out _), "Problem details should carry a traceId for support.");
    }
}
