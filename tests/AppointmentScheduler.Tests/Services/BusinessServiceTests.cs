using AppointmentScheduler.Application.Services;

namespace AppointmentScheduler.Tests.Services;

public class BusinessServiceTests
{
    [Theory]
    [InlineData("Mi Barbería", "mi-barberia")]
    [InlineData("Cool Cuts & Shaves", "cool-cuts-shaves")]
    [InlineData("Clínica San José", "clinica-san-jose")]
    [InlineData("  Spaces Around  ", "spaces-around")]
    [InlineData("UPPER CASE", "upper-case")]
    [InlineData("café-résumé", "cafe-resume")]
    [InlineData("123 Numbers", "123-numbers")]
    [InlineData("special!@#chars", "special-chars")]
    public void GenerateSlug_VariousNames_ProducesCorrectSlug(string input, string expected)
    {
        var result = BusinessService.GenerateSlug(input);
        Assert.Equal(expected, result);
    }

    [Fact]
    public void GenerateSlug_EmptyString_ReturnsEmpty()
    {
        var result = BusinessService.GenerateSlug("");
        Assert.Equal("", result);
    }
}
