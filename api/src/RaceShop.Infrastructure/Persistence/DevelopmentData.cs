using Microsoft.EntityFrameworkCore;
using RaceShop.Domain.Cars;
using RaceShop.Domain.Parts;

namespace RaceShop.Infrastructure.Persistence;

/// <summary>
/// A small, readable data set for local development: three cars and parts in every life status.
/// The 100k-part performance data set is a separate seed script (docs/perf).
/// </summary>
public static class DevelopmentData
{
    public static async Task SeedAsync(RaceShopDbContext db, TimeProvider clock, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(db);
        ArgumentNullException.ThrowIfNull(clock);

        if (await db.Cars.AnyAsync(cancellationToken))
        {
            return;
        }

        var car24 = new Car("24", "Red Line Racing", "CH-24-003");
        var car48 = new Car("48", "Red Line Racing", "CH-48-001");
        var car7 = new Car("07", "Red Line Racing", "CH-07-002");

        var rotor = new Part("BR-380-F", "Front brake rotor, 380 mm", "Brakes", "Brembo", new LifeLimit(500m, LifeUnit.Miles), 1_450m);
        var pads = new Part("BR-PAD-F", "Front brake pad set", "Brakes", "Brembo", new LifeLimit(300m, LifeUnit.Miles), 380m);
        var gearbox = new Part("DT-GB-6S", "Six-speed sequential gearbox", "Drivetrain", "Xtrac", new LifeLimit(40m, LifeUnit.Hours), 48_000m);
        var halfshaft = new Part("DT-HS-L", "Left halfshaft", "Drivetrain", "Xtrac", new LifeLimit(1_500m, LifeUnit.Miles), 2_100m);
        var damper = new Part("SU-DMP-F", "Front damper", "Suspension", "Penske", new LifeLimit(2_000m, LifeUnit.Miles), 3_600m);
        var engine = new Part("EN-V8-55", "5.5 L V8 engine", "Engine", "Ilmor", new LifeLimit(60m, LifeUnit.Hours), 95_000m);

        var serials = new[]
        {
            new SerializedPart(rotor, "BR380-0001", 120m),
            new SerializedPart(rotor, "BR380-0002", 410m), // warning
            new SerializedPart(rotor, "BR380-0003", 505m), // expired
            new SerializedPart(pads, "PAD-1001", 0m),
            new SerializedPart(pads, "PAD-1002", 250m), // warning
            new SerializedPart(gearbox, "XT6-0042", 12.5m),
            new SerializedPart(gearbox, "XT6-0043", 33m), // warning
            new SerializedPart(halfshaft, "HSL-0310", 900m),
            new SerializedPart(damper, "PEN-F-77", 1_200m),
            new SerializedPart(engine, "ILM-V8-0009", 18m),
        };

        var now = clock.GetUtcNow();
        serials[0].InstallOn(car24, now.AddDays(-3));
        serials[5].InstallOn(car24, now.AddDays(-3));
        serials[9].InstallOn(car48, now.AddDays(-10));

        db.Cars.AddRange(car24, car48, car7);
        db.Parts.AddRange(rotor, pads, gearbox, halfshaft, damper, engine);
        db.SerializedParts.AddRange(serials);
        await db.SaveChangesAsync(cancellationToken);
    }
}
