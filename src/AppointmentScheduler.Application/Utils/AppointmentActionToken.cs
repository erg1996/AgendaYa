using System.Buffers.Binary;
using System.Security.Cryptography;
using System.Text;

namespace AppointmentScheduler.Application.Utils;

public enum AppointmentAction { Confirm, Cancel }

/// <summary>
/// HMAC-signed, URL-safe, short-lived token binding an appointment id + action.
/// Used for one-click confirm/cancel links sent over WhatsApp where the customer
/// is not authenticated.
///
/// Layout (before base64url):
///   16 bytes   appointment id (Guid)
///    1 byte    action (0 = Confirm, 1 = Cancel)
///    8 bytes   expiration unix seconds (big-endian)
///   32 bytes   HMAC-SHA256 over the preceding 25 bytes
/// </summary>
public static class AppointmentActionToken
{
    private const int PayloadLen = 16 + 1 + 8;
    private const int TotalLen = PayloadLen + 32;
    private static readonly byte[] DomainLabel = Encoding.UTF8.GetBytes("appointment-action-v1");

    public static string Generate(Guid appointmentId, AppointmentAction action, DateTimeOffset expires, string baseSecret)
    {
        Span<byte> buf = stackalloc byte[TotalLen];
        appointmentId.TryWriteBytes(buf[..16]);
        buf[16] = (byte)action;
        BinaryPrimitives.WriteInt64BigEndian(buf.Slice(17, 8), expires.ToUnixTimeSeconds());

        using var hmac = new HMACSHA256(DeriveKey(baseSecret));
        hmac.TryComputeHash(buf[..PayloadLen], buf[PayloadLen..], out _);

        return Base64UrlEncode(buf);
    }

    public static bool TryValidate(string token, string baseSecret, DateTimeOffset now, out Guid appointmentId, out AppointmentAction action)
    {
        appointmentId = Guid.Empty;
        action = default;

        if (string.IsNullOrWhiteSpace(token)) return false;

        byte[] buf;
        try { buf = Base64UrlDecode(token); }
        catch { return false; }

        if (buf.Length != TotalLen) return false;

        using var hmac = new HMACSHA256(DeriveKey(baseSecret));
        Span<byte> expected = stackalloc byte[32];
        hmac.TryComputeHash(buf.AsSpan(0, PayloadLen), expected, out _);

        if (!CryptographicOperations.FixedTimeEquals(expected, buf.AsSpan(PayloadLen)))
            return false;

        var expires = BinaryPrimitives.ReadInt64BigEndian(buf.AsSpan(17, 8));
        if (now.ToUnixTimeSeconds() > expires) return false;

        var actionByte = buf[16];
        if (actionByte > 1) return false;

        appointmentId = new Guid(buf.AsSpan(0, 16));
        action = (AppointmentAction)actionByte;
        return true;
    }

    private static byte[] DeriveKey(string baseSecret)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(baseSecret));
        return hmac.ComputeHash(DomainLabel);
    }

    private static string Base64UrlEncode(ReadOnlySpan<byte> data)
    {
        var s = Convert.ToBase64String(data);
        return s.TrimEnd('=').Replace('+', '-').Replace('/', '_');
    }

    private static byte[] Base64UrlDecode(string s)
    {
        var padded = s.Replace('-', '+').Replace('_', '/');
        padded = padded.PadRight(padded.Length + (4 - padded.Length % 4) % 4, '=');
        return Convert.FromBase64String(padded);
    }
}
