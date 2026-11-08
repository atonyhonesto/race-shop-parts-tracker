using RaceShop.Application;
using RaceShop.Application.Installs;
using RaceShop.Domain;
using RaceShop.Domain.Cars;
using RaceShop.Domain.Parts;

namespace RaceShop.UnitTests.Application;

public sealed class InstallUseCaseTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 7, 14, 30, 0, TimeSpan.Zero);

    private readonly InMemoryInventoryStore _store = new();
    private readonly FixedClock _clock = new(Now);
    private readonly Car _car = new("24", "Team Red", "CH-024");

    public InstallUseCaseTests() => _store.Cars.Add(_car);

    private SerializedPart AddPart(decimal accumulatedHours)
    {
        var part = new Part("GB-6S", "Six-speed gearbox", "Drivetrain", "Xtrac", new LifeLimit(40m, LifeUnit.Hours), 48_000m);
        var serialized = new SerializedPart(part, $"GB-{Guid.NewGuid():N}", accumulatedHours);
        _store.Parts.Add(serialized);
        return serialized;
    }

    [Fact]
    public async Task InstallPart_ReturnsWarningAndPercentAndSaves()
    {
        var part = AddPart(accumulatedHours: 34);

        var result = await new InstallPart(_store, _clock).ExecuteAsync(part.Id, _car.Id, CancellationToken.None);

        Assert.Equal(LifeStatus.Warning, result.LifeStatus);
        Assert.Equal(85.0m, result.LifeUsedPercent);
        Assert.Equal(part.CurrentInstall?.Id, result.InstallRecordId);
        Assert.Equal(Now, part.CurrentInstall?.InstalledAt);
        Assert.Equal(1, _store.SaveCount);
    }

    [Fact]
    public async Task InstallPart_UnknownPart_ThrowsNotFound()
    {
        var error = await Assert.ThrowsAsync<NotFoundException>(
            () => new InstallPart(_store, _clock).ExecuteAsync(Guid.NewGuid(), _car.Id, CancellationToken.None));

        Assert.Equal("Serialized part", error.Resource);
    }

    [Fact]
    public async Task InstallPart_UnknownCar_ThrowsNotFound()
    {
        var part = AddPart(accumulatedHours: 0);

        var error = await Assert.ThrowsAsync<NotFoundException>(
            () => new InstallPart(_store, _clock).ExecuteAsync(part.Id, Guid.NewGuid(), CancellationToken.None));

        Assert.Equal("Car", error.Resource);
    }

    [Fact]
    public async Task InstallPart_ExpiredPart_DoesNotSave()
    {
        var part = AddPart(accumulatedHours: 40);

        await Assert.ThrowsAsync<DomainException>(
            () => new InstallPart(_store, _clock).ExecuteAsync(part.Id, _car.Id, CancellationToken.None));

        Assert.Equal(0, _store.SaveCount);
    }

    [Fact]
    public async Task RemovePart_UsesClockAndSaves()
    {
        var part = AddPart(accumulatedHours: 10);
        part.InstallOn(_car, Now.AddHours(-5));

        await new RemovePart(_store, _clock).ExecuteAsync(part.Id, usageSinceInstall: 2.5m, CancellationToken.None);

        var install = Assert.Single(part.Installs);
        Assert.Equal(Now, install.RemovedAt);
        Assert.Equal(12.5m, part.AccumulatedUsage);
        Assert.Equal(1, _store.SaveCount);
    }

    [Fact]
    public async Task RetirePart_UnknownPart_ThrowsNotFound() =>
        await Assert.ThrowsAsync<NotFoundException>(
            () => new RetirePart(_store).ExecuteAsync(Guid.NewGuid(), CancellationToken.None));

    private sealed class InMemoryInventoryStore : IInventoryStore
    {
        public List<SerializedPart> Parts { get; } = [];

        public List<Car> Cars { get; } = [];

        public int SaveCount { get; private set; }

        public Task<SerializedPart?> GetSerializedPartAsync(Guid id, CancellationToken cancellationToken) =>
            Task.FromResult(Parts.SingleOrDefault(p => p.Id == id));

        public Task<Car?> GetCarAsync(Guid id, CancellationToken cancellationToken) =>
            Task.FromResult(Cars.SingleOrDefault(c => c.Id == id));

        public Task SaveChangesAsync(CancellationToken cancellationToken)
        {
            SaveCount++;
            return Task.CompletedTask;
        }
    }

    private sealed class FixedClock(DateTimeOffset now) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => now;
    }
}
