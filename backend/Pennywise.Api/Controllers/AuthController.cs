using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pennywise.Api.DTOs;
using Pennywise.Api.Models;
using Pennywise.Api.Repositories;
using Pennywise.Api.Services;

namespace Pennywise.Api.Controllers;

[ApiController]
public class AuthController : ControllerBase
{
    private readonly IGoogleTokenValidator _tokenValidator;
    private readonly IUserRepository _userRepository;
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        IGoogleTokenValidator tokenValidator,
        IUserRepository userRepository,
        ILogger<AuthController> logger)
    {
        _tokenValidator = tokenValidator;
        _userRepository = userRepository;
        _logger = logger;
    }

    [HttpPost("/auth/google")]
    public async Task<IActionResult> GoogleLogin([FromBody] GoogleLoginDto request)
    {
        if (string.IsNullOrWhiteSpace(request.IdToken))
        {
            return BadRequest(new { error = "ID token is required" });
        }

        // Validate the Google ID token
        var googleUser = await _tokenValidator.ValidateTokenAsync(request.IdToken);
        if (googleUser == null)
        {
            return Unauthorized(new { error = "Invalid Google ID token" });
        }

        // Find or create user
        var user = await _userRepository.GetByGoogleSubjectIdAsync(googleUser.Subject);

        if (user == null)
        {
            // Create new user
            user = new User
            {
                Username = googleUser.Name ?? googleUser.Email,
                Email = googleUser.Email,
                GoogleSubjectId = googleUser.Subject,
                PictureUrl = googleUser.Picture
            };
            user = await _userRepository.CreateAsync(user);
            _logger.LogInformation("Created new user {UserId} for Google subject {GoogleSub}", user.Id, googleUser.Subject);
        }
        else
        {
            // Update existing user info if needed
            var needsUpdate = false;
            if (googleUser.Name != null && user.Username != googleUser.Name)
            {
                user.Username = googleUser.Name;
                needsUpdate = true;
            }
            if (user.Email != googleUser.Email)
            {
                user.Email = googleUser.Email;
                needsUpdate = true;
            }
            if (user.PictureUrl != googleUser.Picture)
            {
                user.PictureUrl = googleUser.Picture;
                needsUpdate = true;
            }

            if (needsUpdate)
            {
                await _userRepository.UpdateAsync(user);
                _logger.LogInformation("Updated user {UserId} info", user.Id);
            }
        }

        // Create claims for the cookie
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Email, user.Email),
            new(ClaimTypes.Name, user.Username),
            new("google_sub", googleUser.Subject)
        };

        if (!string.IsNullOrEmpty(user.PictureUrl))
        {
            claims.Add(new Claim("picture", user.PictureUrl));
        }

        var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
        var principal = new ClaimsPrincipal(identity);

        var authProperties = new AuthenticationProperties
        {
            IsPersistent = true,
            ExpiresUtc = DateTimeOffset.UtcNow.AddDays(7)
        };

        await HttpContext.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            principal,
            authProperties);

        _logger.LogInformation("User {UserId} signed in", user.Id);

        return Ok(new CurrentUserDto
        {
            Id = user.Id,
            Email = user.Email,
            Name = user.Username,
            PictureUrl = user.PictureUrl
        });
    }

    [HttpPost("/auth/logout")]
    [Authorize]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        _logger.LogInformation("User signed out");
        return Ok(new { message = "Logged out successfully" });
    }

    [HttpGet("/api/me")]
    [Authorize]
    public IActionResult GetCurrentUser()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var email = User.FindFirst(ClaimTypes.Email)?.Value;
        var name = User.FindFirst(ClaimTypes.Name)?.Value;
        var picture = User.FindFirst("picture")?.Value;

        if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized(new { error = "Invalid user session" });
        }

        return Ok(new CurrentUserDto
        {
            Id = userId,
            Email = email ?? "",
            Name = name ?? "",
            PictureUrl = picture
        });
    }
}
