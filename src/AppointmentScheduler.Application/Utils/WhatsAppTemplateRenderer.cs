using System.Globalization;

namespace AppointmentScheduler.Application.Utils;

public static class WhatsAppTemplateRenderer
{
    public const string DefaultTemplate =
        "Hola {cliente} 👋\n\nTe recordamos tu cita en *{negocio}* mañana:\n\n📅 {fecha}\n🕐 {hora}\n💈 {servicio}\n\n✅ Confirmar: {confirmar_url}\n❌ Cancelar: {cancelar_url}\n\n¡Te esperamos!";

    private static readonly CultureInfo EsCulture = new("es");

    /// <summary>
    /// Renders a WhatsApp reminder message.
    /// Placeholders: {cliente}, {negocio}, {servicio}, {fecha}, {hora}, {confirmar_url}, {cancelar_url}
    /// </summary>
    public static string Render(
        string? template,
        string customerName,
        string businessName,
        string serviceName,
        DateTime appointmentDate,
        string? confirmUrl = null,
        string? cancelUrl = null)
    {
        var t = string.IsNullOrWhiteSpace(template) ? DefaultTemplate : template;

        return t
            .Replace("{cliente}", customerName)
            .Replace("{negocio}", businessName)
            .Replace("{servicio}", serviceName)
            .Replace("{fecha}", appointmentDate.ToString("dddd d 'de' MMMM", EsCulture))
            .Replace("{hora}", appointmentDate.ToString("h:mm tt", CultureInfo.InvariantCulture).ToUpper())
            .Replace("{confirmar_url}", confirmUrl ?? "")
            .Replace("{cancelar_url}", cancelUrl ?? "");
    }

    public static string BuildWaUrl(string phoneDigitsOnly, string message) =>
        $"https://wa.me/{phoneDigitsOnly}?text={Uri.EscapeDataString(message)}";
}
