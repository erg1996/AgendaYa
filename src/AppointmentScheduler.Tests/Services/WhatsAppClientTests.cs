using System.Net;
using System.Net.Http.Json;
using AppointmentScheduler.Application.DTOs;
using AppointmentScheduler.Application.Services;
using AppointmentScheduler.Domain.Entities;
using AppointmentScheduler.Infrastructure.Services;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using Moq.Protected;
using Xunit;

namespace AppointmentScheduler.Tests.Services;

public class WhatsAppClientTests
{
    private static (WhatsAppClient client, Mock<HttpMessageHandler> handler) Build(
        HttpStatusCode statusCode, object? body = null, string? baseUrl = null)
    {
        var handler = new Mock<HttpMessageHandler>();
        HttpContent? content = body is null ? null : JsonContent.Create(body);
        handler.Protected()
            .Setup<Task<HttpResponseMessage>>("SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage { StatusCode = statusCode, Content = content });

        var http = new HttpClient(handler.Object)
        {
            BaseAddress = new Uri(baseUrl ?? "http://localhost:3100/"),
            Timeout = TimeSpan.FromSeconds(5),
        };

        var opts = Options.Create(new WhatsAppOptions
        {
            ServiceUrl = baseUrl ?? "http://localhost:3100",
            InternalSecret = "test-secret",
        });

        var client = new WhatsAppClient(http, opts, NullLogger<WhatsAppClient>.Instance);
        return (client, handler);
    }

    [Fact]
    public async Task PingAsync_Returns_True_On_200()
    {
        var (client, _) = Build(HttpStatusCode.OK, new { pong = true });
        var result = await client.PingAsync();
        result.Should().BeTrue();
    }

    [Fact]
    public async Task PingAsync_Returns_False_On_500()
    {
        var (client, _) = Build(HttpStatusCode.InternalServerError);
        var result = await client.PingAsync();
        result.Should().BeFalse();
    }

    [Fact]
    public async Task StartSessionAsync_Returns_Status_On_200()
    {
        var (client, _) = Build(HttpStatusCode.OK, new { status = "waiting_qr", lastError = (string?)null });
        var result = await client.StartSessionAsync(Guid.NewGuid());
        result.Should().NotBeNull();
        result!.Status.Should().Be(WhatsAppSessionStatus.WaitingQr);
    }

    [Fact]
    public async Task StartSessionAsync_Returns_Null_On_503()
    {
        var (client, _) = Build(HttpStatusCode.ServiceUnavailable);
        var result = await client.StartSessionAsync(Guid.NewGuid());
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetRemoteStatusAsync_Returns_Null_On_404()
    {
        var (client, _) = Build(HttpStatusCode.NotFound);
        var result = await client.GetRemoteStatusAsync(Guid.NewGuid());
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetRemoteStatusAsync_Parses_Connected_Status()
    {
        var id = Guid.NewGuid();
        var (client, _) = Build(HttpStatusCode.OK, new
        {
            status = "connected",
            phoneNumber = "50378901234",
            lastConnectedAt = (DateTime?)null,
            lastQrGeneratedAt = (DateTime?)null,
            lastError = (string?)null,
        });
        var result = await client.GetRemoteStatusAsync(id);
        result.Should().NotBeNull();
        result!.Status.Should().Be(WhatsAppSessionStatus.Connected);
        result.PhoneNumber.Should().Be("50378901234");
    }

    [Fact]
    public async Task DisconnectAsync_Returns_True_On_204()
    {
        var (client, _) = Build(HttpStatusCode.NoContent);
        var result = await client.DisconnectAsync(Guid.NewGuid());
        result.Should().BeTrue();
    }

    [Fact]
    public async Task SendMessageAsync_Returns_True_On_200()
    {
        var (client, _) = Build(HttpStatusCode.OK, new { ok = true });
        var result = await client.SendMessageAsync(Guid.NewGuid(), "50378901234", "Hola", "appt-1");
        result.Should().BeTrue();
    }

    [Fact]
    public async Task SendMessageAsync_Returns_False_On_409()
    {
        var (client, _) = Build(HttpStatusCode.Conflict, new { ok = false, reason = "min_interval" });
        var result = await client.SendMessageAsync(Guid.NewGuid(), "50378901234", "Hola", "appt-1");
        result.Should().BeFalse();
    }

    [Fact]
    public async Task PingAsync_Returns_False_On_NetworkException()
    {
        var handler = new Mock<HttpMessageHandler>();
        handler.Protected()
            .Setup<Task<HttpResponseMessage>>("SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ThrowsAsync(new HttpRequestException("network error"));

        var http = new HttpClient(handler.Object) { BaseAddress = new Uri("http://unreachable/") };
        var opts = Options.Create(new WhatsAppOptions { ServiceUrl = "http://unreachable", InternalSecret = "x" });
        var client = new WhatsAppClient(http, opts, NullLogger<WhatsAppClient>.Instance);

        var result = await client.PingAsync();
        result.Should().BeFalse();
    }
}
