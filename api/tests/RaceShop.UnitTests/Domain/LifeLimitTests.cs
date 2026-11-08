using RaceShop.Domain.Parts;

namespace RaceShop.UnitTests.Domain;

public sealed class LifeLimitTests
{
    private static readonly LifeLimit FiveHundredMiles = new(500m, LifeUnit.Miles);

    [Theory]
    [InlineData(0, LifeStatus.Ok)]
    [InlineData(399.9, LifeStatus.Ok)]
    [InlineData(400, LifeStatus.Warning)] // exactly 80%
    [InlineData(499.9, LifeStatus.Warning)]
    [InlineData(500, LifeStatus.Expired)] // exactly 100%
    [InlineData(750, LifeStatus.Expired)]
    public void Evaluate_ReturnsStatusAtThresholdBoundaries(decimal accumulated, LifeStatus expected) =>
        Assert.Equal(expected, FiveHundredMiles.Evaluate(accumulated));

    [Fact]
    public void UsedFraction_IsAccumulatedOverLimit() =>
        Assert.Equal(0.85m, FiveHundredMiles.UsedFraction(425m));

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void Constructor_RejectsNonPositiveLimit(decimal value) =>
        Assert.Throws<ArgumentOutOfRangeException>(() => new LifeLimit(value, LifeUnit.Hours));

    [Fact]
    public void Constructor_RejectsUndefinedUnit() =>
        Assert.Throws<ArgumentOutOfRangeException>(() => new LifeLimit(10m, (LifeUnit)99));
}
