using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using RaceShop.Api.Auth;
using RaceShop.IntegrationTests.Infrastructure;

namespace RaceShop.IntegrationTests.Security;

/// <summary>
/// Checks every mapped route, so a new endpoint can't ship without a policy.
/// The 401/403 tests cover known routes; this one covers routes nobody has written a test for yet.
/// </summary>
public sealed class EndpointPolicyTests
{
    private static readonly string[] AnonymousRoutes = ["/health", "/openapi/{documentName}.json"];

    [Fact]
    public async Task EveryApiEndpoint_RequiresReadInventory_AndWritesRequireManageInventory()
    {
        await using var api = new ApiFactory();
        var endpoints = api.Services.GetRequiredService<EndpointDataSource>().Endpoints.OfType<RouteEndpoint>().ToList();
        Assert.NotEmpty(endpoints);

        foreach (var endpoint in endpoints)
        {
            var route = endpoint.RoutePattern.RawText ?? endpoint.DisplayName ?? "?";
            if (AnonymousRoutes.Contains(route))
            {
                Assert.NotNull(endpoint.Metadata.GetMetadata<IAllowAnonymous>());
                continue;
            }

            var policies = endpoint.Metadata.GetOrderedMetadata<IAuthorizeData>().Select(a => a.Policy).ToList();
            Assert.True(policies.Contains(Policies.ReadInventory), $"{route} has no {Policies.ReadInventory} policy.");

            var isWrite = endpoint.Metadata.GetMetadata<HttpMethodMetadata>()?.HttpMethods.Any(m => m != "GET") ?? true;
            if (isWrite)
            {
                Assert.True(policies.Contains(Policies.ManageInventory), $"{route} changes data but has no {Policies.ManageInventory} policy.");
            }
        }
    }
}
