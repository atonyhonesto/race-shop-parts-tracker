namespace RaceShop.Domain.Cars;

public sealed class Car
{
    public Car(string carNumber, string team, string chassisId)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(carNumber);
        ArgumentException.ThrowIfNullOrWhiteSpace(team);
        ArgumentException.ThrowIfNullOrWhiteSpace(chassisId);

        Id = Guid.CreateVersion7();
        CarNumber = carNumber;
        Team = team;
        ChassisId = chassisId;
    }

    // For EF Core materialization.
    private Car()
    {
        CarNumber = Team = ChassisId = string.Empty;
    }

    public Guid Id { get; private set; }

    /// <summary>The number painted on the car, e.g. "24". A string because "07" is not "7".</summary>
    public string CarNumber { get; private set; }

    public string Team { get; private set; }

    public string ChassisId { get; private set; }
}
