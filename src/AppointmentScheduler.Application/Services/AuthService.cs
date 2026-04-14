using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using AppointmentScheduler.Application.DTOs;
using AppointmentScheduler.Application.Exceptions;
using AppointmentScheduler.Application.Interfaces;
using AppointmentScheduler.Domain.Entities;
using Microsoft.IdentityModel.Tokens;

namespace AppointmentScheduler.Application.Services;

public class AuthService
{
    private readonly IUserRepository _userRepository;
    private readonly IBusinessRepository _businessRepository;
    private readonly IUserBusinessRepository _userBusinessRepository;
    private readonly string _jwtSecret;

    public AuthService(
        IUserRepository userRepository,
        IBusinessRepository businessRepository,
        IUserBusinessRepository userBusinessRepository,
        string jwtSecret)
    {
        _userRepository = userRepository;
        _businessRepository = businessRepository;
        _userBusinessRepository = userBusinessRepository;
        _jwtSecret = jwtSecret;
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
    {
        // Validate invite code — read from env var REGISTRATION_INVITE_CODE
        var configuredCode = Environment.GetEnvironmentVariable("REGISTRATION_INVITE_CODE");
        if (!string.IsNullOrWhiteSpace(configuredCode) &&
            !string.Equals(request.InviteCode.Trim(), configuredCode.Trim(), StringComparison.Ordinal))
        {
            throw new ForbiddenException("Código de invitación inválido.");
        }

        // Validate password complexity
        ValidatePassword(request.Password);

        // Validate email format
        if (!request.Email.Contains('@') || request.Email.Length < 5)
            throw new ConflictException("Invalid email format.");

        var existing = await _userRepository.GetByEmailAsync(request.Email);
        if (existing != null)
            throw new ConflictException("An account with this email already exists.");

        var slug = BusinessService.GenerateSlug(request.BusinessName);
        var existingBiz = await _businessRepository.GetBySlugAsync(slug);
        if (existingBiz != null)
            slug = $"{slug}-{Guid.NewGuid().ToString()[..4]}";

        var business = new Business
        {
            Id = Guid.NewGuid(),
            Name = request.BusinessName,
            Slug = slug,
            CreatedAt = DateTime.UtcNow
        };

        await _businessRepository.AddAsync(business);

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = request.Email.ToLowerInvariant().Trim(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            FullName = request.FullName,
            BusinessId = business.Id,
            CreatedAt = DateTime.UtcNow
        };

        await _userRepository.AddAsync(user);

        // Link user to business in UserBusiness join table
        await _userBusinessRepository.AddAsync(new UserBusiness
        {
            UserId = user.Id,
            BusinessId = business.Id,
            CreatedAt = DateTime.UtcNow
        });

        await _userRepository.SaveChangesAsync();

        var token = GenerateToken(user);
        return new AuthResponse(token, user.Id, user.Email, user.FullName, business.Id, business.Name, business.Slug);
    }

    // Pre-computed bcrypt hash of a random string. Used to equalize timing when the user does not exist,
    // so an attacker can't distinguish "unknown email" from "wrong password" by latency.
    private const string DummyPasswordHash = "$2a$11$N1Yx8LQ4k9b3M2Wn5rCq0u6Rk1Vb9Xs7j4Hn2Lp8TqE3Zf5Cy6Wa";

    public async Task<AuthResponse> LoginAsync(LoginRequest request)
    {
        var normalizedEmail = request.Email.ToLowerInvariant().Trim();
        var user = await _userRepository.GetByEmailAsync(normalizedEmail);

        // Always run bcrypt to keep response timing constant regardless of whether the email exists.
        var hashToVerify = user?.PasswordHash ?? DummyPasswordHash;
        var passwordOk = BCrypt.Net.BCrypt.Verify(request.Password, hashToVerify);

        if (user == null || !passwordOk)
            throw new NotFoundException("Invalid email or password.");

        var business = await _businessRepository.GetByIdAsync(user.BusinessId)
            ?? throw new NotFoundException("Business not found.");

        var token = GenerateToken(user);
        return new AuthResponse(token, user.Id, user.Email, user.FullName, business.Id, business.Name, business.Slug);
    }

    private static void ValidatePassword(string password)
    {
        if (password.Length < 8)
            throw new ConflictException("Password must be at least 8 characters.");
        if (!password.Any(char.IsUpper))
            throw new ConflictException("Password must contain at least one uppercase letter.");
        if (!password.Any(char.IsLower))
            throw new ConflictException("Password must contain at least one lowercase letter.");
        if (!password.Any(char.IsDigit))
            throw new ConflictException("Password must contain at least one number.");
    }

    private string GenerateToken(User user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtSecret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim("businessId", user.BusinessId.ToString()),
        };

        var token = new JwtSecurityToken(
            issuer: "AgendaYa",
            audience: "AgendaYa",
            claims: claims,
            expires: DateTime.UtcNow.AddHours(24),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
