using AppointmentScheduler.Application.Utils;
using FluentAssertions;
using Xunit;

namespace AppointmentScheduler.Tests.Utils;

public class PhoneNormalizerTests
{
    [Theory]
    [InlineData("78901234",       "50378901234")]
    [InlineData("7890-1234",      "50378901234")]
    [InlineData("+503 7890-1234", "50378901234")]
    [InlineData("50378901234",    "50378901234")]
    public void NormalizeForWaMe_Valid(string input, string expected)
    {
        PhoneNormalizer.NormalizeForWaMe(input).Should().Be(expected);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("12345")]        // too short
    [InlineData("123456789012")] // too long / wrong prefix
    public void NormalizeForWaMe_Invalid_Returns_Null(string? input)
    {
        PhoneNormalizer.NormalizeForWaMe(input).Should().BeNull();
    }
}
