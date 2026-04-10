using System.Security.Cryptography;

namespace AppointmentScheduler.API.Middleware;

public class CsrfMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IHostEnvironment _environment;
    private const string CsrfTokenHeader = "X-CSRF-Token";
    private const string CsrfTokenCookieName = "XSRF-TOKEN";

    public CsrfMiddleware(RequestDelegate next, IHostEnvironment environment)
    {
        _next = next;
        _environment = environment;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // For GET requests or health checks, generate CSRF token in cookie if not present
        if ((context.Request.Method == "GET" || context.Request.Path == "/health") && !context.Request.Cookies.ContainsKey(CsrfTokenCookieName))
        {
            var token = GenerateToken();
            context.Response.Cookies.Append(CsrfTokenCookieName, token, new Microsoft.AspNetCore.Http.CookieOptions
            {
                HttpOnly = false, // JavaScript needs to read it
                Secure = !_environment.IsDevelopment(), // Only require HTTPS in production
                SameSite = Microsoft.AspNetCore.Http.SameSiteMode.Strict,
                MaxAge = TimeSpan.FromHours(1)
            });
        }

        // For state-changing requests (POST, PUT, PATCH, DELETE), validate CSRF token
        if (IsStatefulRequest(context.Request.Method) && context.Request.Path.Value != null && !context.Request.Path.Value.Contains("/api/auth"))
        {
            var tokenFromHeader = context.Request.Headers[CsrfTokenHeader].ToString();
            var tokenFromCookie = context.Request.Cookies[CsrfTokenCookieName];

            if (string.IsNullOrEmpty(tokenFromHeader) || string.IsNullOrEmpty(tokenFromCookie) || tokenFromHeader != tokenFromCookie)
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                context.Response.ContentType = "application/json";
                await context.Response.WriteAsync(System.Text.Json.JsonSerializer.Serialize(new { error = "CSRF token validation failed" }));
                return;
            }
        }

        await _next(context);
    }

    private bool IsStatefulRequest(string method) =>
        method == "POST" || method == "PUT" || method == "PATCH" || method == "DELETE";

    private static string GenerateToken()
    {
        using var rng = RandomNumberGenerator.Create();
        var tokenData = new byte[32];
        rng.GetBytes(tokenData);
        return Convert.ToBase64String(tokenData);
    }
}
