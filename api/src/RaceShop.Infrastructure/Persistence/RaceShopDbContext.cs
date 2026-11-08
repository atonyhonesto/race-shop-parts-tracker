using Microsoft.EntityFrameworkCore;
using RaceShop.Domain.Cars;
using RaceShop.Domain.Parts;

namespace RaceShop.Infrastructure.Persistence;

public sealed class RaceShopDbContext(DbContextOptions<RaceShopDbContext> options) : DbContext(options)
{
    public DbSet<Part> Parts => Set<Part>();

    public DbSet<SerializedPart> SerializedParts => Set<SerializedPart>();

    public DbSet<Car> Cars => Set<Car>();

    public DbSet<InstallRecord> InstallRecords => Set<InstallRecord>();

    protected override void OnModelCreating(ModelBuilder modelBuilder) =>
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(RaceShopDbContext).Assembly);
}
