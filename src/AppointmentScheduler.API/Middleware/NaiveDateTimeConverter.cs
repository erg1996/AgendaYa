using System.Text.Json;
using System.Text.Json.Serialization;

namespace AppointmentScheduler.API.Middleware;

// All datetimes in this app are El Salvador local time stored as-is (no UTC conversion).
// Npgsql 8 reads timestamptz as DateTimeKind.Utc, which causes System.Text.Json to append Z,
// making the browser interpret the value as UTC and display -6h.
// This converter serializes every DateTime without timezone suffix so the browser
// treats it as local time (correct for all API consumers running in El Salvador).
public sealed class NaiveDateTimeConverter : JsonConverter<DateTime>
{
    private const string Format = "yyyy-MM-ddTHH:mm:ss";

    public override DateTime Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        => reader.GetDateTime();

    public override void Write(Utf8JsonWriter writer, DateTime value, JsonSerializerOptions options)
        => writer.WriteStringValue(value.ToString(Format));
}
