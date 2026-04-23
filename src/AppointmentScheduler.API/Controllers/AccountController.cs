using System.Security.Claims;
using AppointmentScheduler.Application.DTOs;
using AppointmentScheduler.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AppointmentScheduler.API.Controllers;

[ApiController]
[Route("api/account")]
[Authorize]
public class AccountController : ControllerBase
{
    private readonly AccountService _accountService;

    public AccountController(AccountService accountService) => _accountService = accountService;

    /// <summary>
    /// GDPR: Exporta todos los datos del usuario autenticado.
    /// </summary>
    [HttpGet("my-data")]
    public async Task<IActionResult> ExportMyData()
    {
        var userId = GetCurrentUserId();
        var data = await _accountService.ExportMyDataAsync(userId);
        return Ok(data);
    }

    /// <summary>
    /// GDPR: Elimina permanentemente la cuenta, el negocio y todos los datos asociados.
    /// Requiere confirmar la contraseña.
    /// </summary>
    [HttpDelete]
    public async Task<IActionResult> DeleteAccount([FromBody] DeleteAccountRequest request)
    {
        var userId = GetCurrentUserId();
        await _accountService.DeleteAccountAsync(userId, request.Password);
        return NoContent();
    }

    private Guid GetCurrentUserId()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new UnauthorizedAccessException("User ID not found in token.");
        return Guid.Parse(claim);
    }
}
