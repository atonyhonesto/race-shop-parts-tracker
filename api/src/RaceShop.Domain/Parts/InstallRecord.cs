namespace RaceShop.Domain.Parts;

/// <summary>
/// One period during which a serialized part was installed on a car.
/// Open while <see cref="RemovedAt"/> is null. Created and closed only by <see cref="SerializedPart"/>.
/// </summary>
public sealed class InstallRecord
{
    internal InstallRecord(Guid serializedPartId, Guid carId, DateTimeOffset installedAt)
    {
        Id = Guid.CreateVersion7();
        SerializedPartId = serializedPartId;
        CarId = carId;
        InstalledAt = installedAt;
    }

    // For EF Core materialization.
    private InstallRecord()
    {
    }

    public Guid Id { get; private set; }

    public Guid SerializedPartId { get; private set; }

    public Guid CarId { get; private set; }

    public DateTimeOffset InstalledAt { get; private set; }

    public DateTimeOffset? RemovedAt { get; private set; }

    /// <summary>The part's total accumulated miles or hours when it came off the car.</summary>
    public decimal? UsageAtRemoval { get; private set; }

    public bool IsOpen => RemovedAt is null;

    internal void Close(DateTimeOffset removedAt, decimal usageAtRemoval)
    {
        if (removedAt < InstalledAt)
        {
            throw new DomainException("install.removed_before_installed", "A part cannot be removed before it was installed.");
        }

        RemovedAt = removedAt;
        UsageAtRemoval = usageAtRemoval;
    }
}
