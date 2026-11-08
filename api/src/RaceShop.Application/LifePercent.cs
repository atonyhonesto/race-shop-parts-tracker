using RaceShop.Domain.Parts;

namespace RaceShop.Application;

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
