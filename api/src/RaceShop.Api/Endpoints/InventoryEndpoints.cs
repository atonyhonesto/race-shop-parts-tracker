using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http.HttpResults;
using RaceShop.Api.Auth;
using RaceShop.Application;
using RaceShop.Application.Installs;
using RaceShop.Application.Queries;

namespace RaceShop.Api.Endpoints;

public sealed record InstallPartRequest(Guid CarId);

public sealed record RemovePartRequest([property: Range(0.0, 100_000.0)] decimal UsageSinceInstall);

internal static class InventoryEndpoints
{
    public static IEndpointRouteBuilder MapInventoryEndpoints(this IEndpointRouteBuilder app)
    {
        // Every route in the group needs at least ReadInventory. Write routes also need ManageInventory.
        var api = app.MapGroup("/api").RequireAuthorization(Policies.ReadInventory);

        api.MapGet("/parts", SearchParts)
            .WithName("SearchParts")
            .WithTags("Parts")
            .ProducesValidationProblem();

        api.MapGet("/cars", ListCars)
            .WithName("ListCars")
            .WithTags("Cars");

        var serialized = api.MapGroup("/serialized-parts").WithTags("Serialized parts");

        serialized.MapGet("/{id:guid}", GetSerializedPart)
            .WithName("GetSerializedPart");

        serialized.MapPost("/{id:guid}/install", InstallPart)
            .WithName("InstallPart")
            .RequireAuthorization(Policies.ManageInventory)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict);

        serialized.MapPost("/{id:guid}/remove", RemovePart)
            .WithName("RemovePart")
            .RequireAuthorization(Policies.ManageInventory)
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict);

        serialized.MapPost("/{id:guid}/retire", RetirePart)
            .WithName("RetirePart")
            .RequireAuthorization(Policies.ManageInventory)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict);

        return app;
    }

    private static async Task<Ok<PagedResult<PartSummary>>> SearchParts(
        IInventoryQueries queries,
        CancellationToken cancellationToken,
        [MaxLength(100)] string? search = null,
        [Range(1, 100_000)] int page = 1,
        [Range(1, PartSearch.MaxPageSize)] int pageSize = 25) =>
        TypedResults.Ok(await queries.SearchPartsAsync(new PartSearch(search, page, pageSize), cancellationToken));

    private static async Task<Ok<IReadOnlyList<CarSummary>>> ListCars(
        IInventoryQueries queries,
        CancellationToken cancellationToken) =>
        TypedResults.Ok(await queries.ListCarsAsync(cancellationToken));

    private static async Task<Results<Ok<SerializedPartDetails>, NotFound>> GetSerializedPart(
        Guid id,
        IInventoryQueries queries,
        CancellationToken cancellationToken) =>
        await queries.GetSerializedPartAsync(id, cancellationToken) is { } details
            ? TypedResults.Ok(details)
            : TypedResults.NotFound();

    private static async Task<Ok<InstallPartResult>> InstallPart(
        Guid id,
        InstallPartRequest request,
        InstallPart useCase,
        CancellationToken cancellationToken) =>
        TypedResults.Ok(await useCase.ExecuteAsync(id, request.CarId, cancellationToken));

    private static async Task<NoContent> RemovePart(
        Guid id,
        RemovePartRequest request,
        RemovePart useCase,
        CancellationToken cancellationToken)
    {
        await useCase.ExecuteAsync(id, request.UsageSinceInstall, cancellationToken);
        return TypedResults.NoContent();
    }

    private static async Task<NoContent> RetirePart(
        Guid id,
        RetirePart useCase,
        CancellationToken cancellationToken)
    {
        await useCase.ExecuteAsync(id, cancellationToken);
        return TypedResults.NoContent();
    }
}
