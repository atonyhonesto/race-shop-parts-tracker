using Microsoft.AspNetCore.Diagnostics;
using RaceShop.Application;
using RaceShop.Domain;

namespace RaceShop.Api.Errors;

/// <summary>
/// Maps expected failures to RFC 9457 problem details with a stable <c>code</c> clients can switch on.
/// Anything else falls through to the default 500 response, which never includes exception details.
/// Every response includes a <c>traceId</c> that matches the logs and traces (docs/runbook.md).
/// </summary>
internal sealed class ProblemDetailsExceptionHandler(IProblemDetailsService problemDetails) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        (int Status, string Title, string Code)? mapped = exception switch
        {
            NotFoundException => (StatusCodes.Status404NotFound, "Not found", "not_found"),
            DomainException domain => (StatusCodes.Status409Conflict, "Business rule violated", domain.Code),
            ConcurrencyConflictException => (StatusCodes.Status409Conflict, "Conflict", "concurrency_conflict"),
            _ => null,
        };

        if (mapped is not { } problem)
        {
            return false;
        }

        httpContext.Response.StatusCode = problem.Status;
        return await problemDetails.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            Exception = exception,
            ProblemDetails =
            {
                Status = problem.Status,
                Title = problem.Title,
                Detail = exception.Message,
                Extensions = { ["code"] = problem.Code },
            },
        });
    }
}
