using System.Globalization;
using System.Net;
using AppointmentScheduler.Application.Services;
using Microsoft.AspNetCore.Mvc;

namespace AppointmentScheduler.API.Controllers;

/// <summary>
/// Public (unauthenticated) endpoints that process one-click confirm / cancel
/// links sent to customers over WhatsApp. Access control is the HMAC-signed
/// token — possession of a valid token authorizes the action on that appointment.
/// </summary>
[ApiController]
[Route("a")]
public class AppointmentActionController : ControllerBase
{
    private readonly AppointmentService _appointmentService;

    public AppointmentActionController(AppointmentService appointmentService)
    {
        _appointmentService = appointmentService;
    }

    [HttpGet("c/{token}")]
    public async Task<IActionResult> Confirm(string token)
    {
        var result = await _appointmentService.ApplyActionByTokenAsync(token);
        return ContentResult(result);
    }

    [HttpGet("x/{token}")]
    public async Task<IActionResult> Cancel(string token)
    {
        var result = await _appointmentService.ApplyActionByTokenAsync(token);
        return ContentResult(result);
    }

    private IActionResult ContentResult(AppointmentActionResult r) =>
        new ContentResult
        {
            Content = RenderPage(r),
            ContentType = "text/html; charset=utf-8",
            StatusCode = r.Outcome switch
            {
                AppointmentActionOutcome.InvalidOrExpired => (int)HttpStatusCode.BadRequest,
                AppointmentActionOutcome.NotFound => (int)HttpStatusCode.NotFound,
                _ => (int)HttpStatusCode.OK
            }
        };

    private static string RenderPage(AppointmentActionResult r)
    {
        var (title, icon, headline, body, color) = r.Outcome switch
        {
            AppointmentActionOutcome.Confirmed => (
                "Cita confirmada",
                "✅",
                "¡Cita confirmada!",
                $"Gracias {Html(r.CustomerName)}. Tu cita en <b>{Html(r.BusinessName)}</b> para {FormatDate(r.AppointmentDate)} queda confirmada.",
                "#16a34a"),
            AppointmentActionOutcome.Cancelled => (
                "Cita cancelada",
                "❌",
                "Cita cancelada",
                $"Tu cita en <b>{Html(r.BusinessName)}</b> para {FormatDate(r.AppointmentDate)} fue cancelada. Si fue un error, contacta directamente al negocio para reagendar.",
                "#dc2626"),
            AppointmentActionOutcome.AlreadyCancelled => (
                "Cita ya cancelada",
                "ℹ️",
                "Esta cita ya estaba cancelada",
                "No se requiere ninguna acción.",
                "#64748b"),
            AppointmentActionOutcome.AlreadyCompleted => (
                "Cita ya completada",
                "ℹ️",
                "Esta cita ya se completó",
                "No se puede modificar una cita pasada.",
                "#64748b"),
            AppointmentActionOutcome.NotFound => (
                "Cita no encontrada",
                "⚠️",
                "No encontramos esta cita",
                "Puede que haya sido eliminada. Contacta al negocio si crees que es un error.",
                "#dc2626"),
            _ => (
                "Enlace inválido",
                "⚠️",
                "Enlace inválido o expirado",
                "Por seguridad, los enlaces de confirmación expiran a las 48 horas. Contacta al negocio para confirmar o cancelar tu cita.",
                "#dc2626")
        };

        return $@"<!doctype html>
<html lang=""es"">
<head>
<meta charset=""utf-8"">
<meta name=""viewport"" content=""width=device-width, initial-scale=1"">
<title>AgendaYa — {Html(title)}</title>
<style>
  *{{box-sizing:border-box}}
  body{{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;margin:0;background:#f8fafc;color:#0f172a;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:1rem}}
  .card{{background:#fff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,.06);max-width:420px;width:100%;padding:2rem 1.5rem;text-align:center}}
  .icon{{font-size:3.5rem;margin-bottom:1rem}}
  h1{{color:{color};font-size:1.4rem;margin:0 0 1rem}}
  p{{line-height:1.6;color:#334155}}
  .brand{{margin-top:1.5rem;color:#94a3b8;font-size:.85rem}}
</style>
</head>
<body>
<div class=""card"">
  <div class=""icon"">{icon}</div>
  <h1>{Html(headline)}</h1>
  <p>{body}</p>
  <div class=""brand"">AgendaYa</div>
</div>
</body>
</html>";
    }

    private static string Html(string? s) =>
        string.IsNullOrEmpty(s) ? "" : WebUtility.HtmlEncode(s);

    private static string FormatDate(DateTime? dt) =>
        dt.HasValue
            ? dt.Value.ToString("dddd d 'de' MMMM 'a las' h:mm tt", new CultureInfo("es"))
            : "";
}
