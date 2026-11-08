using Microsoft.EntityFrameworkCore;
using RaceShop.Application;
using RaceShop.Application.Queries;
using RaceShop.Domain.Parts;

namespace RaceShop.Infrastructure.Persistence;

internal sealed class EfInventoryQueries(RaceShopDbContext db) : IInventoryQueries
{
    /// <summary>
    /// First, straightforward version of the parts search. It loads full entities and matches
    /// with LIKE '%text%'. docs/perf/parts-search.md measures and tunes it at 100k parts.
    /// </summary>
    public async Task<PagedResult<PartSummary>> SearchPartsAsync(PartSearch search, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(search);

        var query = db.Parts.AsQueryable();
        if (!string.IsNullOrWhiteSpace(search.Text))
        {
            var text = search.Text.Trim();
            query = query.Where(p =>
                p.PartNumber.Contains(text) || p.Description.Contains(text) || p.Manufacturer.Contains(text));
        }

        var total = await query.CountAsync(cancellationToken);
        var parts = await query
            .OrderBy(p => p.PartNumber)
            .Skip(search.Skip)
            .Take(search.PageSize)
            .ToListAsync(cancellationToken);

        var partIds = parts.Select(p => p.Id).ToList();
        var counts = await db.SerializedParts
            .Where(s => partIds.Contains(s.PartId))
            .GroupBy(s => new { s.PartId, s.Status })
            .Select(g => new { g.Key.PartId, g.Key.Status, Count = g.Count() })
            .ToListAsync(cancellationToken);

        int CountOf(Guid partId, PartStatus status) =>
            counts.Where(c => c.PartId == partId && c.Status == status).Sum(c => c.Count);

        var items = parts
            .Select(p => new PartSummary(
                p.Id,
                p.PartNumber,
                p.Description,
                p.Category,
                p.Manufacturer,
                p.LifeLimit.Value,
                p.LifeLimit.Unit,
                p.Cost,
                CountOf(p.Id, PartStatus.InStock),
                CountOf(p.Id, PartStatus.Installed)))
            .ToList();

        return new PagedResult<PartSummary>(items, search.Page, search.PageSize, total);
    }

    public async Task<PartDetails?> GetPartAsync(Guid id, CancellationToken cancellationToken)
    {
        var part = await db.Parts
            .AsNoTracking()
            .Where(p => p.Id == id)
            .Select(p => new
            {
                p.Id,
                p.PartNumber,
                p.Description,
                p.Category,
                p.Manufacturer,
                LimitValue = p.LifeLimit.Value,
                LimitUnit = p.LifeLimit.Unit,
                p.Cost,
            })
            .SingleOrDefaultAsync(cancellationToken);

        if (part is null)
        {
            return null;
        }

        var serials = await db.SerializedParts
            .AsNoTracking()
            .Where(s => s.PartId == id)
            .OrderBy(s => s.SerialNumber)
            .Select(s => new
            {
                s.Id,
                s.SerialNumber,
                s.Status,
                s.AccumulatedUsage,
                CarNumber = s.Installs
                    .Where(i => i.RemovedAt == null)
                    .Select(i => db.Cars.Where(c => c.Id == i.CarId).Select(c => c.CarNumber).First())
                    .FirstOrDefault(),
            })
            .ToListAsync(cancellationToken);

        var limit = new LifeLimit(part.LimitValue, part.LimitUnit);
        return new PartDetails(
            part.Id,
            part.PartNumber,
            part.Description,
            part.Category,
            part.Manufacturer,
            limit.Value,
            limit.Unit,
            part.Cost,
            serials
                .Select(s => new SerializedPartSummary(
                    s.Id,
                    s.SerialNumber,
                    s.Status,
                    s.AccumulatedUsage,
                    LifePercent.Of(limit, s.AccumulatedUsage),
                    limit.Evaluate(s.AccumulatedUsage),
                    s.CarNumber))
                .ToList());
    }

    public async Task<SerializedPartDetails?> GetSerializedPartAsync(Guid id, CancellationToken cancellationToken)
    {
        var row = await db.SerializedParts
            .AsNoTracking()
            .Where(s => s.Id == id)
            .Select(s => new
            {
                s.Id,
                s.SerialNumber,
                s.PartId,
                s.Part.PartNumber,
                s.Part.Description,
                s.Status,
                s.AccumulatedUsage,
                LimitValue = s.Part.LifeLimit.Value,
                LimitUnit = s.Part.LifeLimit.Unit,
                Current = s.Installs
                    .Where(i => i.RemovedAt == null)
                    .Select(i => new
                    {
                        i.Id,
                        i.CarId,
                        CarNumber = db.Cars.Where(c => c.Id == i.CarId).Select(c => c.CarNumber).First(),
                        i.InstalledAt,
                    })
                    .FirstOrDefault(),
            })
            .SingleOrDefaultAsync(cancellationToken);

        if (row is null)
        {
            return null;
        }

        var limit = new LifeLimit(row.LimitValue, row.LimitUnit);
        return new SerializedPartDetails(
            row.Id,
            row.SerialNumber,
            row.PartId,
            row.PartNumber,
            row.Description,
            row.Status,
            row.AccumulatedUsage,
            limit.Value,
            limit.Unit,
            LifePercent.Of(limit, row.AccumulatedUsage),
            limit.Evaluate(row.AccumulatedUsage),
            row.Current is null
                ? null
                : new CurrentInstall(row.Current.Id, row.Current.CarId, row.Current.CarNumber, row.Current.InstalledAt));
    }

    public async Task<IReadOnlyList<CarSummary>> ListCarsAsync(CancellationToken cancellationToken) =>
        await db.Cars
            .AsNoTracking()
            .OrderBy(c => c.CarNumber)
            .Select(c => new CarSummary(c.Id, c.CarNumber, c.Team, c.ChassisId))
            .ToListAsync(cancellationToken);
}
