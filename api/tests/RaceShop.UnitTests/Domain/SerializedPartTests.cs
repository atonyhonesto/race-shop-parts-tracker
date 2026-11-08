using RaceShop.Domain;
using RaceShop.Domain.Cars;
using RaceShop.Domain.Parts;

namespace RaceShop.UnitTests.Domain;

public sealed class SerializedPartTests
{
    private static readonly DateTimeOffset RaceDay = new(2026, 11, 7, 9, 0, 0, TimeSpan.Zero);

    private readonly Car _car24 = new("24", "Team Red", "CH-024");
    private readonly Car _car48 = new("48", "Team Red", "CH-048");

    private static SerializedPart Rotor(decimal accumulatedMiles) =>
        new(
            new Part("BR-380-F", "Front brake rotor, 380 mm", "Brakes", "Brembo", new LifeLimit(500m, LifeUnit.Miles), 1450m),
            "SN-0001",
            accumulatedMiles);

    [Fact]
    public void InstallOn_InStockPart_InstallsAndOpensRecord()
    {
        var part = Rotor(accumulatedMiles: 100);

        var status = part.InstallOn(_car24, RaceDay);

        Assert.Equal(LifeStatus.Ok, status);
        Assert.Equal(PartStatus.Installed, part.Status);
        var install = Assert.Single(part.Installs);
        Assert.True(install.IsOpen);
        Assert.Equal(_car24.Id, install.CarId);
    }

    [Fact]
    public void InstallOn_PartAlreadyOnAnotherCar_IsRejected()
    {
        var part = Rotor(accumulatedMiles: 0);
        part.InstallOn(_car24, RaceDay);

        var error = Assert.Throws<DomainException>(() => part.InstallOn(_car48, RaceDay));

        Assert.Equal("part.already_installed", error.Code);
        Assert.Single(part.Installs);
    }

    [Fact]
    public void InstallOn_PartAtEightyPercent_InstallsWithWarning()
    {
        var part = Rotor(accumulatedMiles: 400);

        Assert.Equal(LifeStatus.Warning, part.InstallOn(_car24, RaceDay));
        Assert.Equal(PartStatus.Installed, part.Status);
    }

    [Fact]
    public void InstallOn_PartAtLifeLimit_IsBlocked()
    {
        var part = Rotor(accumulatedMiles: 500);

        var error = Assert.Throws<DomainException>(() => part.InstallOn(_car24, RaceDay));

        Assert.Equal("part.life_expired", error.Code);
        Assert.Equal(PartStatus.InStock, part.Status);
        Assert.Empty(part.Installs);
    }

    [Fact]
    public void InstallOn_RetiredPart_IsRejected()
    {
        var part = Rotor(accumulatedMiles: 0);
        part.Retire();

        Assert.Equal("part.retired", Assert.Throws<DomainException>(() => part.InstallOn(_car24, RaceDay)).Code);
    }

    [Fact]
    public void Remove_AddsUsageAndClosesRecordWithTotal()
    {
        var part = Rotor(accumulatedMiles: 100);
        part.InstallOn(_car24, RaceDay);

        part.Remove(RaceDay.AddHours(3), usageSinceInstall: 312.5m);

        Assert.Equal(PartStatus.InStock, part.Status);
        Assert.Equal(412.5m, part.AccumulatedUsage);
        var install = Assert.Single(part.Installs);
        Assert.False(install.IsOpen);
        Assert.Equal(412.5m, install.UsageAtRemoval);
        Assert.Null(part.CurrentInstall);
    }

    [Fact]
    public void Remove_PartNotInstalled_IsRejected()
    {
        var part = Rotor(accumulatedMiles: 0);

        Assert.Equal("part.not_installed", Assert.Throws<DomainException>(() => part.Remove(RaceDay, 10)).Code);
    }

    [Fact]
    public void Remove_BeforeInstallTime_IsRejected()
    {
        var part = Rotor(accumulatedMiles: 0);
        part.InstallOn(_car24, RaceDay);

        var error = Assert.Throws<DomainException>(() => part.Remove(RaceDay.AddMinutes(-1), 10));

        Assert.Equal("install.removed_before_installed", error.Code);
    }

    [Fact]
    public void Remove_NegativeUsage_IsRejected()
    {
        var part = Rotor(accumulatedMiles: 0);
        part.InstallOn(_car24, RaceDay);

        Assert.Throws<ArgumentOutOfRangeException>(() => part.Remove(RaceDay.AddHours(1), -1));
    }

    [Fact]
    public void Retire_InstalledPart_IsRejected()
    {
        var part = Rotor(accumulatedMiles: 0);
        part.InstallOn(_car24, RaceDay);

        Assert.Equal("part.installed", Assert.Throws<DomainException>(part.Retire).Code);
    }

    [Fact]
    public void Retire_InStockPart_Retires()
    {
        var part = Rotor(accumulatedMiles: 0);

        part.Retire();

        Assert.Equal(PartStatus.Retired, part.Status);
    }
}
