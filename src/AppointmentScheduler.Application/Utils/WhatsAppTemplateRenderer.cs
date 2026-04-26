using System.Globalization;

namespace AppointmentScheduler.Application.Utils;

public static class WhatsAppTemplateRenderer
{
    public const string DefaultTemplate =
        "Hola {cliente} 👋\n\nTe recordamos tu cita en *{negocio}* mañana:\n\n📅 {fecha}\n🕐 {hora}\n💈 {servicio}\n\n✅ Confirmar: {confirmar_url}\n❌ Cancelar: {cancelar_url}\n\n¡Te esperamos!";

    // Built-in rotation variants used when the business hasn't set a custom template.
    // Selected by hash(appointmentId) so the same appointment always gets the same variant.
    private static readonly string[] DefaultVariants =
    [
        "Hola {cliente} 👋\n\nTe recordamos tu cita en *{negocio}* mañana:\n\n📅 {fecha}\n🕐 {hora}\n💈 {servicio}\n\n✅ Confirmar: {confirmar_url}\n❌ Cancelar: {cancelar_url}\n\n¡Te esperamos!",
        "Buenas {cliente}!\n\nMañana tienes cita en *{negocio}*:\n\n🗓 {fecha} a las {hora}\n✂️ Servicio: {servicio}\n\nConfirmar: {confirmar_url}\nCancelar: {cancelar_url}",
        "Hey {cliente} 😊\n\nRecordatorio: mañana {fecha} a las {hora} tienes *{servicio}* en {negocio}.\n\nConfirma tu asistencia: {confirmar_url}\nCancela si no puedes: {cancelar_url}",
    ];

    private static readonly CultureInfo EsCulture = new("es");

    /// <summary>
    /// Renders a WhatsApp reminder message.
    /// Placeholders: {cliente}, {negocio}, {servicio}, {fecha}, {hora}, {confirmar_url}, {cancelar_url}
    /// When no custom template is set, rotates among built-in variants using appointmentId hash
    /// so each appointment consistently gets one variant (no byte-identical bulk).
    /// </summary>
    public static string Render(
        string? template,
        string customerName,
        string businessName,
        string serviceName,
        DateTime appointmentDate,
        string? confirmUrl = null,
        string? cancelUrl = null,
        Guid? appointmentId = null)
    {
        string t;
        if (string.IsNullOrWhiteSpace(template))
        {
            var idx = appointmentId.HasValue
                ? Math.Abs(appointmentId.Value.GetHashCode()) % DefaultVariants.Length
                : 0;
            t = DefaultVariants[idx];
        }
        else
        {
            t = template;
        }

        return t
            .Replace("{cliente}", customerName)
            .Replace("{negocio}", businessName)
            .Replace("{servicio}", serviceName)
            .Replace("{fecha}", appointmentDate.ToString("dddd d 'de' MMMM", EsCulture))
            .Replace("{hora}", appointmentDate.ToString("h:mm tt", CultureInfo.InvariantCulture).ToUpper())
            .Replace("{confirmar_url}", confirmUrl ?? "")
            .Replace("{cancelar_url}", cancelUrl ?? "");
    }

    private const string ConfirmationTemplate =
        "Hola {cliente} ✅\n\n¡Tu cita en *{negocio}* ha sido reservada!\n\n📅 {fecha}\n🕐 {hora}\n💈 {servicio}\n\nSi necesitas cancelar: {cancelar_url}\n\n¡Te esperamos! 🙌";

    public static string RenderConfirmation(
        string customerName,
        string businessName,
        string serviceName,
        DateTime appointmentDate,
        string cancelUrl)
    {
        return ConfirmationTemplate
            .Replace("{cliente}", customerName)
            .Replace("{negocio}", businessName)
            .Replace("{servicio}", serviceName)
            .Replace("{fecha}", appointmentDate.ToString("dddd d 'de' MMMM", EsCulture))
            .Replace("{hora}", appointmentDate.ToString("h:mm tt", CultureInfo.InvariantCulture).ToUpper())
            .Replace("{cancelar_url}", cancelUrl);
    }

    public static string BuildWaUrl(string phoneDigitsOnly, string message) =>
        $"https://wa.me/{phoneDigitsOnly}?text={Uri.EscapeDataString(message)}";
}
