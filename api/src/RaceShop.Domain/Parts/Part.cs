namespace RaceShop.Domain.Parts;

/// <summary>
/// A catalog entry, such as "front brake rotor, 380 mm". Individual physical items are
/// <see cref="SerializedPart"/>s.
/// </summary>
public sealed class Part
{
    public Part(
        string partNumber,
        string description,
        string category,
        string manufacturer,
        LifeLimit lifeLimit,
        decimal cost)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(partNumber);
        ArgumentException.ThrowIfNullOrWhiteSpace(description);
        ArgumentException.ThrowIfNullOrWhiteSpace(category);
        ArgumentException.ThrowIfNullOrWhiteSpace(manufacturer);
        ArgumentNullException.ThrowIfNull(lifeLimit);
        ArgumentOutOfRangeException.ThrowIfNegative(cost);

        Id = Guid.CreateVersion7();
        PartNumber = partNumber;
        Description = description;
        Category = category;
        Manufacturer = manufacturer;
        LifeLimit = lifeLimit;
        Cost = cost;
    }

    // For EF Core materialization.
    private Part()
    {
        PartNumber = Description = Category = Manufacturer = string.Empty;
        LifeLimit = null!;
    }

    public Guid Id { get; private set; }

    public string PartNumber { get; private set; }

    public string Description { get; private set; }

    public string Category { get; private set; }

    public string Manufacturer { get; private set; }

    public LifeLimit LifeLimit { get; private set; }

    public decimal Cost { get; private set; }
}
