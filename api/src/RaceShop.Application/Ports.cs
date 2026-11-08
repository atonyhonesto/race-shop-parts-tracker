using RaceShop.Application.Queries;
using RaceShop.Domain.Cars;
using RaceShop.Domain.Parts;

namespace RaceShop.Application;

/// <summary>
/// Write-side port: loads aggregates for a use case and saves them.
/// Implemented in Infrastructure (ADR 0001).
/// </summary>
public interface IInventoryStore
{
    /// <summary>Loads a serialized part with its catalog part and its open install record, tracked for update.</summary>
    Task<SerializedPart?> GetSerializedPartAsync(Guid id, CancellationToken cancellationToken);

    Task<Car?> GetCarAsync(Guid id, CancellationToken cancellationToken);

    /// <exception cref="ConcurrencyConflictException">Another request changed the same part first.</exception>
    Task SaveChangesAsync(CancellationToken cancellationToken);
}

/// <summary>
/// Read-side port: returns response models directly, skipping the domain model (CQRS-lite, ADR 0001).
/// This is where query tuning happens (docs/perf).
/// </summary>
public interface IInventoryQueries
{
    Task<PagedResult<PartSummary>> SearchPartsAsync(PartSearch search, CancellationToken cancellationToken);

    Task<PartDetails?> GetPartAsync(Guid id, CancellationToken cancellationToken);

    Task<SerializedPartDetails?> GetSerializedPartAsync(Guid id, CancellationToken cancellationToken);

    Task<IReadOnlyList<CarSummary>> ListCarsAsync(CancellationToken cancellationToken);
}
