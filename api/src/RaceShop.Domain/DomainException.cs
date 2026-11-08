namespace RaceShop.Domain;

/// <summary>
/// A business rule was violated, e.g. installing a part that is already on a car.
/// <see cref="Code"/> is stable and machine-readable; the API returns it to clients.
/// </summary>
public sealed class DomainException(string code, string message) : Exception(message)
{
    public string Code { get; } = code;
}
