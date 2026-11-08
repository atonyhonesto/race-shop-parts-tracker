using System.Reflection;

namespace RaceShop.UnitTests.Architecture;

/// <summary>
/// Guards the dependency rule from ADR 0001: references point inward only
/// (Api -> Infrastructure -> Application -> Domain).
/// </summary>
/// <remarks>
/// Project references already stop a layer from compiling against an outer layer.
/// These tests also catch framework leaks, such as EF Core or ASP.NET Core types
/// used in Domain, which a project reference alone would not stop.
/// The compiler only records assemblies that are actually used, so a test fails
/// as soon as code uses a forbidden dependency.
/// </remarks>
public sealed class LayerDependencyTests
{
    [Fact]
    public void Domain_DependsOnNoOtherLayerOrFramework() =>
        AssertNoReferences(
            "RaceShop.Domain",
            "RaceShop.Application",
            "RaceShop.Infrastructure",
            "RaceShop.Api",
            "Microsoft.EntityFrameworkCore",
            "Microsoft.AspNetCore",
            "Microsoft.Data.SqlClient");

    [Fact]
    public void Application_DoesNotDependOnInfrastructureApiOrDataAccess() =>
        AssertNoReferences(
            "RaceShop.Application",
            "RaceShop.Infrastructure",
            "RaceShop.Api",
            "Microsoft.EntityFrameworkCore",
            "Microsoft.AspNetCore",
            "Microsoft.Data.SqlClient");

    [Fact]
    public void Infrastructure_DoesNotDependOnApiOrHttp() =>
        AssertNoReferences(
            "RaceShop.Infrastructure",
            "RaceShop.Api",
            "Microsoft.AspNetCore");

    private static void AssertNoReferences(string assemblyName, params string[] forbiddenPrefixes)
    {
        var violations = Assembly.Load(assemblyName)
            .GetReferencedAssemblies()
            .Select(reference => reference.Name ?? string.Empty)
            .Where(name => forbiddenPrefixes.Any(prefix => name.StartsWith(prefix, StringComparison.Ordinal)))
            .ToList();

        Assert.True(
            violations.Count == 0,
            $"{assemblyName} must not reference: {string.Join(", ", violations)}");
    }
}
