namespace AppointmentScheduler.Application.Utils;

public static class PhoneNormalizer
{
    /// <summary>
    /// Normalizes a phone number to the digits-only E.164 format required by wa.me links.
    /// Supports El Salvador numbers (country code 503).
    /// Examples: "7890-1234" → "50378901234", "+503 7890-1234" → "50378901234"
    /// Returns null if the number cannot be normalized to a valid ES number.
    /// </summary>
    public static string? NormalizeForWaMe(string? phone)
    {
        if (string.IsNullOrWhiteSpace(phone)) return null;

        var digits = new string(phone.Where(char.IsDigit).ToArray());

        return digits switch
        {
            // Already has 503 prefix: 503 + 8 digits = 11 digits
            var d when d.Length == 11 && d.StartsWith("503") => d,
            // Local 8-digit format (mobile/landline without country code)
            var d when d.Length == 8 => $"503{d}",
            _ => null
        };
    }

    public static bool IsValid(string? phone) => NormalizeForWaMe(phone) is not null;
}
