using System.Text.Json.Serialization;
using RaceShop.Api;
using RaceShop.Api.Auth;
using RaceShop.Api.Endpoints;
using RaceShop.Api.Errors;
using RaceShop.Application.Installs;
using RaceShop.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

// HTTP behavior: RFC 9457 errors, request validation, enums as strings, OpenAPI document.
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<ProblemDetailsExceptionHandler>();
builder.Services.AddValidation();
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
    // Numbers are numbers: reject "12" for 12, so the contract (and the generated client) says `number`.
    options.SerializerOptions.NumberHandling = JsonNumberHandling.Strict;
});
builder.Services.AddOpenApi(options => options.AddDocumentTransformer((document, _, _) =>
{
    document.Info.Title = "Race Shop Parts Tracker API";
    // Clients choose the base URL (dev proxy, deployed host); the contract itself is host-independent.
    document.Servers = [];
    return Task.CompletedTask;
}));
builder.Services.AddHealthChecks();

// Security: Entra ID tokens in production, header-based dev scheme locally (see Auth/).
builder.Services.AddRaceShopAuthentication(builder.Configuration, builder.Environment);
builder.Services.AddRaceShopAuthorization();

// Application and infrastructure (ADR 0001).
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddScoped<InstallPart>();
builder.Services.AddScoped<RemovePart>();
builder.Services.AddScoped<RetirePart>();
builder.Services.AddInfrastructure(builder.Configuration.GetConnectionString("RaceShop"));

var app = builder.Build();

app.UseExceptionHandler();
app.UseStatusCodePages();
app.UseAuthentication();
app.UseAuthorization();

app.MapOpenApi().AllowAnonymous();
app.MapHealthChecks("/health").AllowAnonymous();
app.MapInventoryEndpoints();

if (app.Environment.IsDevelopment())
{
    await app.MigrateAndSeedAsync();
}

await app.RunAsync();

/// <summary>Entry point; public so integration tests can host the API with WebApplicationFactory.</summary>
public partial class Program;
