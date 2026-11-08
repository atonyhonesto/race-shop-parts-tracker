using RaceShop.Domain.Parts;

namespace RaceShop.Application.Queries;

/// <summary>Parts search criteria. <paramref name="Page"/> is 1-based.</summary>
public sealed record PartSearch(string? Text, int Page, int PageSize)
{
    public const int MaxPageSize = 100;

    public int Skip => (Page - 1) * PageSize;
}

public sealed record PagedResult<T>(IReadOnlyList<T> Items, int Page, int PageSize, int TotalCount);

public sealed record PartSummary(
    Guid Id,
    string PartNumber,
    string Description,
    string Category,
    string Manufacturer,
    decimal LifeLimit,
    LifeUnit LifeUnit,
    decimal Cost,
    int InStockCount,
    int InstalledCount);

public sealed record SerializedPartDetails(
    Guid Id,
    string SerialNumber,
    Guid PartId,
    string PartNumber,
    string Description,
    PartStatus Status,
    decimal AccumulatedUsage,
    decimal LifeLimit,
    LifeUnit LifeUnit,
    decimal LifeUsedPercent,
    LifeStatus LifeStatus,
    CurrentInstall? CurrentInstall);

/// <summary>A catalog part with each of its serialized parts and their life status.</summary>
public sealed record PartDetails(
    Guid Id,
    string PartNumber,
    string Description,
    string Category,
    string Manufacturer,
    decimal LifeLimit,
    LifeUnit LifeUnit,
    decimal Cost,
    IReadOnlyList<SerializedPartSummary> SerializedParts);

public sealed record SerializedPartSummary(
    Guid Id,
    string SerialNumber,
    PartStatus Status,
    decimal AccumulatedUsage,
    decimal LifeUsedPercent,
    LifeStatus LifeStatus,
    string? InstalledOnCarNumber);

public sealed record CurrentInstall(Guid InstallRecordId, Guid CarId, string CarNumber, DateTimeOffset InstalledAt);

public sealed record CarSummary(Guid Id, string CarNumber, string Team, string ChassisId);
