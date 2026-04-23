using AppointmentScheduler.Application.Utils;

namespace AppointmentScheduler.Tests.Services;

public class AppointmentActionTokenTests
{
    private const string Secret = "test-secret-key-min-32-chars-long-123";

    [Fact]
    public void RoundTrip_Confirm_Valid()
    {
        var id = Guid.NewGuid();
        var expires = DateTimeOffset.UtcNow.AddHours(1);
        var token = AppointmentActionToken.Generate(id, AppointmentAction.Confirm, expires, Secret);

        var ok = AppointmentActionToken.TryValidate(token, Secret, DateTimeOffset.UtcNow, out var gotId, out var gotAction);

        Assert.True(ok);
        Assert.Equal(id, gotId);
        Assert.Equal(AppointmentAction.Confirm, gotAction);
    }

    [Fact]
    public void RoundTrip_Cancel_Valid()
    {
        var id = Guid.NewGuid();
        var expires = DateTimeOffset.UtcNow.AddHours(1);
        var token = AppointmentActionToken.Generate(id, AppointmentAction.Cancel, expires, Secret);

        var ok = AppointmentActionToken.TryValidate(token, Secret, DateTimeOffset.UtcNow, out _, out var gotAction);

        Assert.True(ok);
        Assert.Equal(AppointmentAction.Cancel, gotAction);
    }

    [Fact]
    public void Tampered_Fails()
    {
        var token = AppointmentActionToken.Generate(Guid.NewGuid(), AppointmentAction.Confirm, DateTimeOffset.UtcNow.AddHours(1), Secret);
        // Flip a character in the middle.
        var tampered = token.Substring(0, 10) + (token[10] == 'A' ? 'B' : 'A') + token.Substring(11);

        var ok = AppointmentActionToken.TryValidate(tampered, Secret, DateTimeOffset.UtcNow, out _, out _);

        Assert.False(ok);
    }

    [Fact]
    public void WrongSecret_Fails()
    {
        var token = AppointmentActionToken.Generate(Guid.NewGuid(), AppointmentAction.Confirm, DateTimeOffset.UtcNow.AddHours(1), Secret);

        var ok = AppointmentActionToken.TryValidate(token, "different-secret-key-min-32-chars-long", DateTimeOffset.UtcNow, out _, out _);

        Assert.False(ok);
    }

    [Fact]
    public void Expired_Fails()
    {
        var issuedAt = DateTimeOffset.UtcNow.AddHours(-10);
        var token = AppointmentActionToken.Generate(Guid.NewGuid(), AppointmentAction.Confirm, issuedAt.AddHours(1), Secret);

        var ok = AppointmentActionToken.TryValidate(token, Secret, DateTimeOffset.UtcNow, out _, out _);

        Assert.False(ok);
    }

    [Fact]
    public void Garbage_Fails()
    {
        Assert.False(AppointmentActionToken.TryValidate("not-a-valid-token", Secret, DateTimeOffset.UtcNow, out _, out _));
        Assert.False(AppointmentActionToken.TryValidate("", Secret, DateTimeOffset.UtcNow, out _, out _));
    }
}
