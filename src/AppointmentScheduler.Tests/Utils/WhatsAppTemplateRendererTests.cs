using AppointmentScheduler.Application.Utils;
using FluentAssertions;
using Xunit;

namespace AppointmentScheduler.Tests.Utils;

public class WhatsAppTemplateRendererTests
{
    private static readonly DateTime TestDate = new(2026, 6, 15, 10, 30, 0);

    [Fact]
    public void Render_ReplacesAllPlaceholders()
    {
        var template = "Hola {cliente}, tu cita en {negocio} para {servicio} es el {fecha} a las {hora}.";

        var result = WhatsAppTemplateRenderer.Render(template, "Juan", "Salón ABC", "Corte", TestDate);

        result.Should().Contain("Juan");
        result.Should().Contain("Salón ABC");
        result.Should().Contain("Corte");
        result.Should().NotContain("{cliente}");
        result.Should().NotContain("{negocio}");
        result.Should().NotContain("{servicio}");
        result.Should().NotContain("{fecha}");
        result.Should().NotContain("{hora}");
    }

    [Fact]
    public void Render_UsesDefaultTemplate_WhenNullProvided()
    {
        var result = WhatsAppTemplateRenderer.Render(null, "Ana", "Negocio", "Servicio", TestDate);

        result.Should().Contain("Ana");
        result.Should().Contain("Negocio");
    }

    [Fact]
    public void Render_UsesDefaultTemplate_WhenEmptyStringProvided()
    {
        var result = WhatsAppTemplateRenderer.Render("   ", "Ana", "Negocio", "Servicio", TestDate);

        result.Should().Contain("Ana");
    }

    [Fact]
    public void Render_IncludesActionUrls_WhenProvided()
    {
        var template = "Confirmar: {confirmar_url} | Cancelar: {cancelar_url}";

        var result = WhatsAppTemplateRenderer.Render(
            template, "x", "x", "x", TestDate,
            confirmUrl: "https://example.com/confirm",
            cancelUrl: "https://example.com/cancel");

        result.Should().Contain("https://example.com/confirm");
        result.Should().Contain("https://example.com/cancel");
    }

    [Fact]
    public void BuildWaUrl_ReturnsValidWaMeLink()
    {
        var url = WhatsAppTemplateRenderer.BuildWaUrl("50378901234", "Hola mundo");

        url.Should().StartWith("https://wa.me/50378901234?text=");
        url.Should().Contain("Hola");
    }
}

public class PhoneNormalizerTests
{
    [Theory]
    [InlineData("78901234", "50378901234")]          // local 8-digit
    [InlineData("7890-1234", "50378901234")]          // local with dash
    [InlineData("+503 7890-1234", "50378901234")]     // full international
    [InlineData("50378901234", "50378901234")]         // already full
    public void NormalizeForWaMe_ValidNumbers_ReturnsNormalized(string input, string expected)
    {
        PhoneNormalizer.NormalizeForWaMe(input).Should().Be(expected);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("123")]          // too short
    [InlineData("1234567890123")] // too long, wrong country
    public void NormalizeForWaMe_InvalidNumbers_ReturnsNull(string? input)
    {
        PhoneNormalizer.NormalizeForWaMe(input).Should().BeNull();
    }

    [Fact]
    public void IsValid_ValidPhone_ReturnsTrue()
    {
        PhoneNormalizer.IsValid("78901234").Should().BeTrue();
    }

    [Fact]
    public void IsValid_InvalidPhone_ReturnsFalse()
    {
        PhoneNormalizer.IsValid("123").Should().BeFalse();
    }
}
