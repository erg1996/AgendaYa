using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace AppointmentScheduler.API.Middleware;

// All datetimes in this app are El Salvador wall-clock stored as-is (no UTC conversion).
// Npgsql 8 reads timestamptz as DateTimeKind.Utc, which causes System.Text.Json to append Z,
// making the browser interpret the value as UTC and display -6h.
//
// Read: parse the wall-clock fields (yyyy-MM-ddTHH:mm:ss) only, ignoring any Z/offset
//   suffix the client might send. This keeps the value the user picked even if a
//   client accidentally calls Date.toISOString() (which adds Z and shifts hours by
//   the browser's TZ offset).
// Write: serialize without any timezone suffix so the browser treats it as local time.
public sealed class NaiveDateTimeConverter : JsonConverter<DateTime>
{
    private const string Format = "yyyy-MM-ddTHH:mm:ss";

    private static readonly string[] WallClockFormats =
    {
        "yyyy-MM-ddTHH:mm:ss",
        "yyyy-MM-ddTHH:mm:ss.f",
        "yyyy-MM-ddTHH:mm:ss.ff",
        "yyyy-MM-ddTHH:mm:ss.fff",
        "yyyy-MM-ddTHH:mm:ss.ffff",
        "yyyy-MM-ddTHH:mm:ss.fffff",
        "yyyy-MM-ddTHH:mm:ss.ffffff",
        "yyyy-MM-ddTHH:mm:ss.fffffff",
        "yyyy-MM-ddTHH:mm",
        "yyyy-MM-dd",
    };

    public override DateTime Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        var raw = reader.GetString();
        if (string.IsNullOrWhiteSpace(raw))
            return reader.GetDateTime();

        // Strip any timezone designator: "Z", "+02:00", "-06:00".
        // We only want the wall-clock portion — the offset is deliberately ignored.
        var s = raw;
        var tIdx = s.IndexOf('T');
        if (tIdx >= 0)
        {
            var afterT = s.AsSpan(tIdx + 1);
            int cut = -1;
            for (int i = 0; i < afterT.Length; i++)
            {
                var c = afterT[i];
                if (c == 'Z' || c == '+' || (c == '-' && i > 0))
                {
                    cut = tIdx + 1 + i;
                    break;
                }
            }
            if (cut >= 0) s = s.Substring(0, cut);
        }

        if (DateTime.TryParseExact(s, WallClockFormats, CultureInfo.InvariantCulture,
                DateTimeStyles.None, out var dt))
        {
            return DateTime.SpecifyKind(dt, DateTimeKind.Unspecified);
        }

        // Last-resort fallback for anything our explicit formats don't cover.
        return DateTime.SpecifyKind(reader.GetDateTime(), DateTimeKind.Unspecified);
    }

    public override void Write(Utf8JsonWriter writer, DateTime value, JsonSerializerOptions options)
        => writer.WriteStringValue(value.ToString(Format, CultureInfo.InvariantCulture));
}
