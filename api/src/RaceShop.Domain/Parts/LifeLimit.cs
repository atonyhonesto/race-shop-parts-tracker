namespace RaceShop.Domain.Parts;

/// <summary>How a part's life is measured.</summary>
public enum LifeUnit
{
    Miles,
    Hours,
}

/// <summary>Where a serialized part is relative to its life limit.</summary>
public enum LifeStatus
{
    /// <summary>Below 80% of the limit.</summary>
    Ok,

    /// <summary>At or above 80%: still installable, but flag it to the crew.</summary>
    Warning,

    /// <summary>At or above 100%: must not be installed.</summary>
    Expired,
}

/// <summary>
/// The maximum use a part may see before it must be replaced, in miles or hours.
/// </summary>
public sealed record LifeLimit
{
    /// <summary>Fraction of life at which a part is flagged.</summary>
    public const decimal WarningThreshold = 0.8m;

    public LifeLimit(decimal value, LifeUnit unit)
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(value);
        if (!Enum.IsDefined(unit))
        {
            throw new ArgumentOutOfRangeException(nameof(unit), unit, "Unknown life unit.");
        }

        Value = value;
        Unit = unit;
    }

    public decimal Value { get; }

    public LifeUnit Unit { get; }

    /// <summary>Share of life used, e.g. 0.85 for 85%. Can exceed 1.</summary>
    public decimal UsedFraction(decimal accumulated) => accumulated / Value;

    public LifeStatus Evaluate(decimal accumulated) => UsedFraction(accumulated) switch
    {
        >= 1m => LifeStatus.Expired,
        >= WarningThreshold => LifeStatus.Warning,
        _ => LifeStatus.Ok,
    };
}
