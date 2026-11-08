namespace RaceShop.Application;

/// <summary>The requested resource does not exist. The API maps this to 404.</summary>
public sealed class NotFoundException(string resource, Guid id)
    : Exception($"{resource} '{id}' was not found.")
{
    public string Resource { get; } = resource;

    public Guid Id { get; } = id;
}

/// <summary>
/// Someone else changed the same data first (row version mismatch or a unique-index race).
/// The API maps this to 409 so the client can reload and retry.
/// </summary>
public sealed class ConcurrencyConflictException(string message, Exception innerException)
    : Exception(message, innerException);
