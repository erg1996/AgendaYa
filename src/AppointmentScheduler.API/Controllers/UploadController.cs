using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AppointmentScheduler.API.Controllers;

[ApiController]
[Route("api/upload")]
[Authorize]
public class UploadController : ControllerBase
{
    private readonly IWebHostEnvironment _env;

    public UploadController(IWebHostEnvironment env) => _env = env;

    private static readonly Dictionary<string, string> AllowedTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        ["image/jpeg"] = ".jpg",
        ["image/png"] = ".png",
        ["image/webp"] = ".webp",
        ["image/gif"] = ".gif",
    };

    [HttpPost("logo")]
    public async Task<IActionResult> UploadLogo(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { error = "No file provided." });

        if (file.Length > 2 * 1024 * 1024)
            return BadRequest(new { error = "File size must be under 2MB." });

        if (!AllowedTypes.TryGetValue(file.ContentType ?? "", out var canonicalExt))
            return BadRequest(new { error = "Only JPG, PNG, WebP, and GIF images are allowed." });

        if (!await HasValidImageSignatureAsync(file, canonicalExt))
            return BadRequest(new { error = "File content does not match its declared type." });

        var webRoot = _env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
        var uploadsDir = Path.GetFullPath(Path.Combine(webRoot, "uploads", "logos"));
        Directory.CreateDirectory(uploadsDir);

        var fileName = $"{Guid.NewGuid():N}{canonicalExt}";
        var filePath = Path.GetFullPath(Path.Combine(uploadsDir, fileName));

        // Defense-in-depth: the resolved path must stay inside uploadsDir.
        if (!filePath.StartsWith(uploadsDir + Path.DirectorySeparatorChar, StringComparison.Ordinal))
            return BadRequest(new { error = "Invalid file path." });

        await using (var stream = new FileStream(filePath, FileMode.CreateNew))
        {
            await file.CopyToAsync(stream);
        }

        var url = $"/uploads/logos/{fileName}";
        return Ok(new { url });
    }

    private static async Task<bool> HasValidImageSignatureAsync(IFormFile file, string ext)
    {
        await using var s = file.OpenReadStream();
        var header = new byte[12];
        var read = await s.ReadAsync(header, 0, header.Length);
        if (read < 4) return false;

        bool jpg = header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF;
        bool png = header[0] == 0x89 && header[1] == 0x50 && header[2] == 0x4E && header[3] == 0x47;
        bool gif = read >= 6 && header[0] == 0x47 && header[1] == 0x49 && header[2] == 0x46 && header[3] == 0x38;
        bool webp = read >= 12
                    && header[0] == 0x52 && header[1] == 0x49 && header[2] == 0x46 && header[3] == 0x46
                    && header[8] == 0x57 && header[9] == 0x45 && header[10] == 0x42 && header[11] == 0x50;

        return ext switch
        {
            ".jpg" => jpg,
            ".png" => png,
            ".gif" => gif,
            ".webp" => webp,
            _ => false,
        };
    }
}
