using RaceShop.Domain.Cars;

namespace RaceShop.Domain.Parts;

public enum PartStatus
{
    InStock,
    Installed,
    Retired,
}

/// <summary>
/// One physical, serial-numbered part. Owns its install history and enforces the install rules:
/// one car at a time, blocked at 100% of life, warned at 80%.
/// </summary>
/// <remarks>
/// The database backs the one-car rule with a filtered unique index and a row version,
/// so two concurrent installs cannot both succeed (see SerializedPartConfiguration).
/// </remarks>
public sealed class SerializedPart
{
    private readonly List<InstallRecord> _installs = [];

    public SerializedPart(Part part, string serialNumber, decimal accumulatedUsage = 0)
    {
        ArgumentNullException.ThrowIfNull(part);
        ArgumentException.ThrowIfNullOrWhiteSpace(serialNumber);
        ArgumentOutOfRangeException.ThrowIfNegative(accumulatedUsage);

        Id = Guid.CreateVersion7();
        Part = part;
        PartId = part.Id;
        SerialNumber = serialNumber;
        AccumulatedUsage = accumulatedUsage;
        Status = PartStatus.InStock;
    }

    // For EF Core materialization.
    private SerializedPart()
    {
        SerialNumber = string.Empty;
        Part = null!;
    }

    public Guid Id { get; private set; }

    public string SerialNumber { get; private set; }

    public Guid PartId { get; private set; }

    public Part Part { get; private set; }

    /// <summary>Total miles or hours run, in the unit of the part's life limit.</summary>
    public decimal AccumulatedUsage { get; private set; }

    public PartStatus Status { get; private set; }

    /// <summary>Install history. Repositories may load only the open record.</summary>
    public IReadOnlyCollection<InstallRecord> Installs => _installs.AsReadOnly();

    public InstallRecord? CurrentInstall => _installs.SingleOrDefault(i => i.IsOpen);

    public LifeStatus LifeStatus => Part.LifeLimit.Evaluate(AccumulatedUsage);

    /// <summary>Installs this part on a car.</summary>
    /// <returns>The life status at install time, so callers can surface a warning.</returns>
    /// <exception cref="DomainException">The part is installed, retired, or out of life.</exception>
    public LifeStatus InstallOn(Car car, DateTimeOffset installedAt)
    {
        ArgumentNullException.ThrowIfNull(car);

        switch (Status)
        {
            case PartStatus.Installed:
                throw new DomainException(
                    "part.already_installed",
                    $"Part {SerialNumber} is already installed on another car. Remove it first.");
            case PartStatus.Retired:
                throw new DomainException("part.retired", $"Part {SerialNumber} is retired.");
            case PartStatus.InStock:
            default:
                break;
        }

        var lifeStatus = LifeStatus;
        if (lifeStatus == LifeStatus.Expired)
        {
            throw new DomainException(
                "part.life_expired",
                $"Part {SerialNumber} has reached its life limit ({Part.LifeLimit.Value} {Part.LifeLimit.Unit}).");
        }

        _installs.Add(new InstallRecord(Id, car.Id, installedAt));
        Status = PartStatus.Installed;
        return lifeStatus;
    }

    /// <summary>Removes this part from its car and adds the miles or hours it ran while installed.</summary>
    public void Remove(DateTimeOffset removedAt, decimal usageSinceInstall)
    {
        ArgumentOutOfRangeException.ThrowIfNegative(usageSinceInstall);

        var install = CurrentInstall
            ?? throw new DomainException("part.not_installed", $"Part {SerialNumber} is not installed.");

        AccumulatedUsage += usageSinceInstall;
        install.Close(removedAt, AccumulatedUsage);
        Status = PartStatus.InStock;
    }

    /// <summary>Takes the part out of service permanently. It must be removed from its car first.</summary>
    public void Retire()
    {
        if (Status == PartStatus.Installed)
        {
            throw new DomainException(
                "part.installed",
                $"Part {SerialNumber} is installed. Remove it before retiring it.");
        }

        Status = PartStatus.Retired;
    }
}
