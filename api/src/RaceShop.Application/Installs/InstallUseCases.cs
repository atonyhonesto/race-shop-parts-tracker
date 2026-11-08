using RaceShop.Domain.Parts;

namespace RaceShop.Application.Installs;

public sealed record InstallPartResult(Guid InstallRecordId, LifeStatus LifeStatus, decimal LifeUsedPercent);

/// <summary>Installs a serialized part on a car. The domain enforces one car at a time and the life limit.</summary>
public sealed class InstallPart(IInventoryStore store, TimeProvider clock)
{
    public async Task<InstallPartResult> ExecuteAsync(Guid serializedPartId, Guid carId, CancellationToken cancellationToken)
    {
        var part = await store.GetSerializedPartAsync(serializedPartId, cancellationToken)
            ?? throw new NotFoundException("Serialized part", serializedPartId);
        var car = await store.GetCarAsync(carId, cancellationToken)
            ?? throw new NotFoundException("Car", carId);

        var lifeStatus = part.InstallOn(car, clock.GetUtcNow());
        await store.SaveChangesAsync(cancellationToken);

        var install = part.CurrentInstall
            ?? throw new InvalidOperationException("Install did not open an install record.");
        return new InstallPartResult(install.Id, lifeStatus, LifePercent.Of(part));
    }
}

/// <summary>Removes a serialized part from its car and records the miles or hours it ran.</summary>
public sealed class RemovePart(IInventoryStore store, TimeProvider clock)
{
    public async Task ExecuteAsync(Guid serializedPartId, decimal usageSinceInstall, CancellationToken cancellationToken)
    {
        var part = await store.GetSerializedPartAsync(serializedPartId, cancellationToken)
            ?? throw new NotFoundException("Serialized part", serializedPartId);

        part.Remove(clock.GetUtcNow(), usageSinceInstall);
        await store.SaveChangesAsync(cancellationToken);
    }
}

/// <summary>Takes a serialized part out of service permanently.</summary>
public sealed class RetirePart(IInventoryStore store)
{
    public async Task ExecuteAsync(Guid serializedPartId, CancellationToken cancellationToken)
    {
        var part = await store.GetSerializedPartAsync(serializedPartId, cancellationToken)
            ?? throw new NotFoundException("Serialized part", serializedPartId);

        part.Retire();
        await store.SaveChangesAsync(cancellationToken);
    }
}

/// <summary>Life used as a percentage with one decimal place, the form shown to users.</summary>
public static class LifePercent
{
    public static decimal Of(SerializedPart part)
    {
        ArgumentNullException.ThrowIfNull(part);
        return Of(part.Part.LifeLimit, part.AccumulatedUsage);
    }

    public static decimal Of(LifeLimit limit, decimal accumulated)
    {
        ArgumentNullException.ThrowIfNull(limit);
        return Math.Round(limit.UsedFraction(accumulated) * 100m, 1, MidpointRounding.AwayFromZero);
    }
}
