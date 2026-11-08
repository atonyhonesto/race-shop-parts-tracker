using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RaceShop.Domain.Cars;
using RaceShop.Domain.Parts;

namespace RaceShop.Infrastructure.Persistence;

// Keys are GUID v7, generated in the domain (time-ordered, so clustered-index inserts stay sequential).
// ValueGeneratedNever tells EF that a new entity with a key set is still new, not an existing row to update.

internal sealed class PartConfiguration : IEntityTypeConfiguration<Part>
{
    public void Configure(EntityTypeBuilder<Part> builder)
    {
        builder.ToTable("Parts");
        builder.Property(p => p.Id).ValueGeneratedNever();

        builder.Property(p => p.PartNumber).HasMaxLength(40);
        builder.HasIndex(p => p.PartNumber).IsUnique();
        builder.Property(p => p.Description).HasMaxLength(200);
        builder.Property(p => p.Category).HasMaxLength(60);
        builder.Property(p => p.Manufacturer).HasMaxLength(100);
        builder.Property(p => p.Cost).HasPrecision(12, 2);

        builder.ComplexProperty(p => p.LifeLimit, life =>
        {
            life.Property(l => l.Value).HasColumnName("LifeLimitValue").HasPrecision(10, 1);
            life.Property(l => l.Unit).HasColumnName("LifeLimitUnit").HasConversion<string>().HasMaxLength(8);
        });
    }
}

internal sealed class SerializedPartConfiguration : IEntityTypeConfiguration<SerializedPart>
{
    public void Configure(EntityTypeBuilder<SerializedPart> builder)
    {
        builder.ToTable("SerializedParts");
        builder.Property(s => s.Id).ValueGeneratedNever();

        builder.Property(s => s.SerialNumber).HasMaxLength(60);
        builder.HasIndex(s => s.SerialNumber).IsUnique();
        builder.Property(s => s.AccumulatedUsage).HasPrecision(10, 1);
        builder.Property(s => s.Status).HasConversion<string>().HasMaxLength(16);

        builder.HasOne(s => s.Part).WithMany().HasForeignKey(s => s.PartId).OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(s => s.Installs).WithOne().HasForeignKey(i => i.SerializedPartId).OnDelete(DeleteBehavior.Restrict);
        builder.Navigation(s => s.Installs).UsePropertyAccessMode(PropertyAccessMode.Field);

        // Optimistic concurrency: two requests that load the same part cannot both save a change.
        // A shadow property keeps this persistence detail out of the domain model.
        builder.Property<byte[]>("RowVersion").IsRowVersion();

        builder.Ignore(s => s.CurrentInstall);
        builder.Ignore(s => s.LifeStatus);
    }
}

internal sealed class InstallRecordConfiguration : IEntityTypeConfiguration<InstallRecord>
{
    public void Configure(EntityTypeBuilder<InstallRecord> builder)
    {
        builder.ToTable("InstallRecords");
        builder.Property(i => i.Id).ValueGeneratedNever();
        builder.Property(i => i.UsageAtRemoval).HasPrecision(10, 1);

        builder.HasOne<Car>().WithMany().HasForeignKey(i => i.CarId).OnDelete(DeleteBehavior.Restrict);

        // The database's guarantee of "one car at a time": at most one open install per part.
        // Backs up the domain rule and the row version if anything bypasses them.
        builder.HasIndex(i => i.SerializedPartId)
            .IsUnique()
            .HasFilter("[RemovedAt] IS NULL")
            .HasDatabaseName("UX_InstallRecords_OneOpenInstallPerPart");

        // Install history for one part, newest first.
        builder.HasIndex(i => new { i.SerializedPartId, i.InstalledAt });

        builder.Ignore(i => i.IsOpen);
    }
}

internal sealed class CarConfiguration : IEntityTypeConfiguration<Car>
{
    public void Configure(EntityTypeBuilder<Car> builder)
    {
        builder.ToTable("Cars");
        builder.Property(c => c.Id).ValueGeneratedNever();

        builder.Property(c => c.CarNumber).HasMaxLength(10);
        builder.HasIndex(c => c.CarNumber).IsUnique();
        builder.Property(c => c.Team).HasMaxLength(100);
        builder.Property(c => c.ChassisId).HasMaxLength(40);
        builder.HasIndex(c => c.ChassisId).IsUnique();
    }
}
