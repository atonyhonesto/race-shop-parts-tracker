using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using RaceShop.Application;
using RaceShop.Domain.Cars;
using RaceShop.Domain.Parts;

namespace RaceShop.Infrastructure.Persistence;

internal sealed class EfInventoryStore(RaceShopDbContext db) : IInventoryStore
{
    // SQL Server error numbers for a duplicate key in a unique index / unique constraint.
    private const int UniqueIndexViolation = 2601;
    private const int UniqueConstraintViolation = 2627;

    public Task<SerializedPart?> GetSerializedPartAsync(Guid id, CancellationToken cancellationToken) =>
        db.SerializedParts
            .Include(s => s.Part)
            .Include(s => s.Installs.Where(i => i.RemovedAt == null))
            .SingleOrDefaultAsync(s => s.Id == id, cancellationToken);

    public Task<Car?> GetCarAsync(Guid id, CancellationToken cancellationToken) =>
        db.Cars.SingleOrDefaultAsync(c => c.Id == id, cancellationToken);

    public async Task SaveChangesAsync(CancellationToken cancellationToken)
    {
        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException ex)
        {
            throw new ConcurrencyConflictException("The part was changed by another request. Reload and try again.", ex);
        }
        catch (DbUpdateException ex) when (ex.InnerException is SqlException
        {
            Number: UniqueIndexViolation or UniqueConstraintViolation,
        })
        {
            throw new ConcurrencyConflictException("The part was changed by another request. Reload and try again.", ex);
        }
    }
}
