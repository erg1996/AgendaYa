using System.Globalization;

namespace AppointmentScheduler.Application.Utils;

public static class WhatsAppTemplateRenderer
{
    public const string DefaultTemplate =
        "Hola {cliente} 👋\n\nTe recordamos tu cita en *{negocio}* mañana:\n\n📅 {fecha}\n🕐 {hora}\n💈 {servicio}\n\nSi necesitas cancelar o cambiar tu cita, por favor contáctanos.\n\n¡Te esperamos!";

    private static readonly TimeZoneInfo EsTimeZone = GetEsTimeZone();
    private static readonly CultureInfo EsCulture = new("es");

    /// <summary>
    /// Renders a WhatsApp reminder message, converting appointmentDateUtc to El Salvador local time.
    /// Placeholders: {cliente}, {negocio}, {servicio}, {fecha}, {hora}
    /// </summary>
    public static string Render(
        string? template,
        string customerName,
        string businessName,
        string serviceName,
        DateTime appointmentDateUtc)
    {
        var local = TimeZoneInfo.ConvertTimeFromUtc(appointmentDateUtc, EsTimeZone);
        var t = string.IsNullOrWhiteSpace(template) ? DefaultTemplate : template;

        return t
            .Replace("{cliente}", customerName)
            .Replace("{negocio}", businessName)
            .Replace("{servicio}", serviceName)
            .Replace("{fecha}", local.ToString("dddd d 'de' MMMM", EsCulture))
            .Replace("{hora}", local.ToString("h:mm tt", CultureInfo.InvariantCulture).ToUpper());
    }

    public static string BuildWaUrl(string phoneDigitsOnly, string message) =>
        $"https://wa.me/{phoneDigitsOnly}?text={Uri.EscapeDataString(message)}";

    private static TimeZoneInfo GetEsTimeZone()
    {
        try { return TimeZoneInfo.FindSystemTimeZoneById("America/El_Salvador"); }
        catch { return TimeZoneInfo.FindSystemTimeZoneById("Central America Standard Time"); }
    }
}
